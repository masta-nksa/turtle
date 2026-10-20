/* ============================================================
   befehle.js – Kurzbeschreibung der Befehle für die Kurzhilfe unter dem Editor.
   Nur Befehle, die im Tool (Skulpt mit den Anpassungen in laufzeit/skulpt.html) gehen.
   Ohne DOM, auch mit node testbar. Je Eintrag: Aufruf und ein Satz.
   ============================================================ */
(function (global) {
  "use strict";

  // [Namen (erster = Hauptname, weitere = Kurzformen), Aufruf, Erklärung]
  var LISTE = [
    // Bewegen
    [["forward", "fd"], "forward(strecke)", "Bewegt die Turtle um «strecke» vorwärts (fd ist die Kurzform)."],
    [["backward", "back", "bk"], "backward(strecke)", "Bewegt die Turtle rückwärts, ohne sich zu drehen (Kurzformen back, bk)."],
    [["goto", "setpos", "setposition"], "goto(x, y)", "Geht direkt zum Punkt (x, y); mit gesenktem Stift entsteht eine Linie."],
    [["setx"], "setx(x)", "Ändert nur die x-Koordinate; y bleibt."],
    [["sety"], "sety(y)", "Ändert nur die y-Koordinate; x bleibt."],
    [["home"], "home()", "Zurück zur Mitte (0, 0), Blick nach rechts."],
    // Drehen
    [["left", "lt"], "left(winkel)", "Dreht die Turtle um «winkel» Grad nach links (lt ist die Kurzform)."],
    [["right", "rt"], "right(winkel)", "Dreht die Turtle um «winkel» Grad nach rechts (rt ist die Kurzform)."],
    [["setheading", "seth"], "setheading(richtung)", "Richtung setzen: 0 = rechts, 90 = oben, 180 = links, 270 = unten."],
    // Stift
    [["penup", "pu", "up"], "penup()", "Stift hoch: Die Turtle bewegt sich ohne Spur."],
    [["pendown", "pd", "down"], "pendown()", "Stift wieder unten: Die Turtle zeichnet."],
    [["pensize", "width"], "pensize(dicke)", "Strichdicke; gilt für alle folgenden Linien."],
    [["isdown"], "isdown()", "True, wenn der Stift unten ist."],
    // Farben und Füllen
    [["color"], "color(farbe) oder color(stift, fuellung)", "Stift- und Füllfarbe, z. B. \"red\", \"#ff8800\" oder (255, 136, 0)."],
    [["pencolor"], "pencolor(farbe)", "Nur die Stiftfarbe."],
    [["fillcolor"], "fillcolor(farbe)", "Nur die Füllfarbe für begin_fill / end_fill."],
    [["begin_fill"], "begin_fill()", "Beginnt eine Fläche; alles bis end_fill() wird gefüllt."],
    [["end_fill"], "end_fill()", "Schliesst die Fläche und füllt sie mit der Füllfarbe."],
    [["bgcolor"], "bgcolor(farbe)", "Hintergrundfarbe des Feldes."],
    [["colormode"], "colormode(255)", "Farbwerte von 0 bis 255 statt 0 bis 1 (im Tool gelten Werte über 1 ohnehin als 0 … 255)."],
    // Kreise und Punkte
    [["circle"], "circle(radius, winkel, ecken)", "Kreis mit der Mitte links der Turtle; mit «winkel» nur ein Bogen, mit «ecken» ein Vieleck."],
    [["dot"], "dot(durchmesser, farbe)", "Gefüllter Punkt an der Stelle der Turtle, auch bei Stift oben."],
    [["stamp"], "stamp()", "Druckt die Form der Turtle als Stempel ins Feld."],
    // Wo ist die Turtle?
    [["xcor"], "xcor()", "x-Koordinate der Turtle."],
    [["ycor"], "ycor()", "y-Koordinate der Turtle."],
    [["pos", "position"], "pos()", "Ort der Turtle als (x, y)."],
    [["heading"], "heading()", "Aktuelle Richtung in Grad (0 = rechts, 90 = oben)."],
    [["distance"], "distance(x, y) oder distance(andere)", "Abstand zum Punkt (x, y) oder zu einer anderen Turtle."],
    [["towards"], "towards(x, y)", "Richtung in Grad, in die die Turtle zum Punkt (x, y) schauen müsste."],
    // Aussehen
    [["shape"], "shape(\"turtle\")", "Form: \"arrow\", \"turtle\", \"circle\", \"square\", \"triangle\" oder \"classic\"."],
    [["hideturtle", "ht"], "hideturtle()", "Turtle ausblenden (zeichnet schneller und schöner)."],
    [["showturtle", "st"], "showturtle()", "Turtle wieder zeigen."],
    [["isvisible"], "isvisible()", "True, wenn die Turtle sichtbar ist."],
    [["speed"], "speed(tempo)", "1 = langsam … 10 = schnell, 0 = sofort; der Tempo-Regler wirkt zusätzlich."],
    // Text
    [["write"], "write(text, align=\"left\", font=(\"Arial\", 16, \"normal\"))", "Schreibt Text ins Feld, dort wo die Turtle steht."],
    // Zeichnung und Bildschirm
    [["clear"], "clear()", "Löscht die Zeichnung dieser Turtle; sie bleibt, wo sie ist."],
    [["reset"], "reset()", "Löscht die Zeichnung und setzt die Turtle zurück in die Mitte."],
    [["clearscreen", "resetscreen"], "clearscreen()", "Löscht alles im Feld, auch die anderen Turtles."],
    [["undo"], "undo()", "Macht den letzten Schritt der Turtle rückgängig."],
    [["tracer"], "tracer(0)", "Zeichnet ohne Zwischenbilder; mit update() wird alles auf einmal gezeigt."],
    [["update"], "update()", "Zeigt alles, was seit tracer(0) gezeichnet wurde."],
    [["window_width"], "window_width()", "Breite der Leinwand (im Tool 1500)."],
    [["window_height"], "window_height()", "Höhe der Leinwand (im Tool 1500)."],
    [["Screen", "getscreen"], "Screen()", "Das Feld als Objekt, z. B. Screen().bgcolor(\"black\")."],
    [["done", "mainloop", "exitonclick"], "done()", "In Python am Ende nötig, damit das Fenster offen bleibt; im Tool ohne Wirkung."],
    // Tasten, Klicks, Timer
    [["onkey"], "onkey(befehl, \"Left\")", "Ruft «befehl» (ohne Klammern) bei dieser Taste auf; danach listen()."],
    [["listen"], "listen()", "Ab jetzt auf Tasten achten (nach onkey)."],
    [["onscreenclick"], "onscreenclick(befehl)", "Ruft befehl(x, y) bei einem Klick ins Feld auf."],
    [["onclick"], "onclick(befehl)", "Ruft befehl(x, y) bei einem Klick auf die Turtle auf."],
    [["ontimer"], "ontimer(befehl, millisekunden)", "Ruft «befehl» einmal nach dieser Zeit auf; für einen Takt in befehl wieder ontimer."],
    // Mehrere Turtles
    [["Turtle"], "Turtle()", "Neue Turtle, z. B. anna = Turtle(); dann anna.forward(50)."],
    [["clone"], "clone()", "Kopie der Turtle an derselben Stelle."],
    // Python
    [["print"], "print(wert, …)", "Schreibt in die Ausgabe unter dem Feld."],
    [["input"], "input(\"Frage? \")", "Fragt nach einer Eingabe; die Antwort ist immer Text."],
    [["range"], "range(ende) oder range(start, ende, schritt)", "Zahlen von start bis vor ende, z. B. range(4) → 0, 1, 2, 3."],
    [["len"], "len(liste)", "Anzahl Elemente einer Liste oder Zeichen eines Texts."],
    [["int"], "int(wert)", "Ganze Zahl, z. B. aus einer Eingabe: int(\"12\") → 12."],
    [["float"], "float(wert)", "Kommazahl, z. B. float(\"2.5\") → 2.5."],
    [["str"], "str(wert)", "Text, z. B. um eine Zahl anzuhängen: \"Punkte: \" + str(5)."],
    [["abs"], "abs(zahl)", "Betrag: abs(-7) → 7."],
    [["round"], "round(zahl, stellen)", "Runden: round(2.567, 1) → 2.6."],
    [["min"], "min(a, b, …)", "Kleinster Wert."],
    [["max"], "max(a, b, …)", "Grösster Wert."],
    [["type"], "type(wert)", "Datentyp, z. B. <class 'int'>."],
    [["randint"], "randint(a, b)", "Zufällige ganze Zahl von a bis und mit b (from random import *)."],
    [["randrange"], "randrange(start, ende, schritt)", "Zufällige Zahl wie aus range(start, ende, schritt)."],
    [["random"], "random()", "Zufällige Kommazahl zwischen 0 und 1."],
    [["choice"], "choice(liste)", "Zufälliges Element einer Liste."],
    [["shuffle"], "shuffle(liste)", "Mischt die Liste."],
    [["append"], "liste.append(wert)", "Hängt einen Wert hinten an die Liste."],
    [["pop"], "liste.pop() oder liste.pop(index)", "Nimmt das letzte (oder das Element an index) aus der Liste und gibt es zurück."],
    [["insert"], "liste.insert(index, wert)", "Fügt einen Wert an der Stelle index ein."],
    [["remove"], "liste.remove(wert)", "Entfernt das erste Vorkommen von wert."],
    [["format"], "\"… {} …\".format(wert)", "Setzt Werte an die Stellen {} im Text."],
    // Schlüsselwörter
    [["for"], "for i in range(n):", "Wiederholt die eingerückten Zeilen; i zählt 0, 1, 2, …"],
    [["while"], "while bedingung:", "Wiederholt, solange die Bedingung gilt."],
    [["if"], "if bedingung:", "Die eingerückten Zeilen laufen nur, wenn die Bedingung wahr ist."],
    [["elif"], "elif bedingung:", "«sonst wenn»: weitere Bedingung, falls die vorigen falsch waren."],
    [["else"], "else:", "«sonst»: läuft, wenn keine Bedingung davor wahr war."],
    [["def"], "def name(parameter):", "Neuer eigener Befehl; die eingerückten Zeilen laufen erst beim Aufruf name(…)."],
    [["return"], "return wert", "Beendet den eigenen Befehl und gibt wert zurück."],
    [["global"], "global name", "Erlaubt einem eigenen Befehl, eine Variable von aussen zu ändern."],
    [["import", "from"], "from turtle import *", "Holt alle Befehle eines Moduls, sodass sie ohne Vorsatz gehen."],
    [["break"], "break", "Beendet die Schleife sofort."],
    [["continue"], "continue", "Springt zum nächsten Durchlauf der Schleife."],
    [["and"], "a and b", "Wahr, wenn beides wahr ist."],
    [["or"], "a or b", "Wahr, wenn mindestens eines wahr ist."],
    [["not"], "not a", "Das Gegenteil."],
    [["in"], "x in liste", "Wahr, wenn x in der Liste vorkommt; in for: der Reihe nach jedes Element."],
    [["True", "False"], "True / False", "Wahrheitswerte: wahr und falsch."],
    [["None"], "None", "«nichts»: kein Wert."]
  ];

  var NACH_NAME = {};
  LISTE.forEach(function (e) {
    var eintrag = { name: e[0][0], namen: e[0], aufruf: e[1], text: e[2] };
    e[0].forEach(function (n) { NACH_NAME[n] = eintrag; });
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

  var api = { liste: LISTE, nachName: NACH_NAME, beiCursor: beiCursor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.TurtleBefehle = api;
})(this);
