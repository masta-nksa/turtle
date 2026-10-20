/* ============================================================
   fehlerhilfe.js – erklärt Python-Fehler auf Deutsch (ohne DOM).
   analysiere({art, nachricht, stapel, code}) liefert
     { zeile, ort, was, tipp, mehr, beispiel: {falsch, richtig} | null, verlauf: [{zeile, funktion, text}] }
   Skulpt meldet Syntaxfehler nur als «bad input», oft eine Zeile zu spät.
   Darum sucht pruefeSyntax() selbst nach den häufigsten Ursachen.
   ============================================================ */
(function (wurzel) {
  "use strict";

  var TURTLE_BEFEHLE = [
    "forward", "fd", "back", "bk", "backward", "left", "lt", "right", "rt", "goto", "setpos", "setposition",
    "setx", "sety", "setheading", "seth", "home", "circle", "dot", "stamp", "speed", "position", "pos",
    "xcor", "ycor", "heading", "towards", "distance", "pendown", "pd", "down", "penup", "pu", "up",
    "pensize", "width", "isdown", "color", "pencolor", "fillcolor", "begin_fill", "end_fill", "filling",
    "reset", "clear", "write", "showturtle", "st", "hideturtle", "ht", "isvisible", "shape", "shapesize",
    "turtlesize", "undo", "onclick", "ondrag", "onrelease", "tilt", "degrees", "radians", "clone"
  ];
  var TURTLE_MODUL = TURTLE_BEFEHLE.concat(["Turtle", "Screen", "done", "mainloop", "bgcolor", "tracer",
    "update", "exitonclick", "onkey", "onkeypress", "listen", "setup", "title", "colormode", "delay"]);
  var EINGEBAUT = ["print", "input", "range", "int", "str", "float", "len", "abs", "round", "min", "max",
    "sum", "list", "True", "False", "None", "import", "turtle", "random", "math", "bool", "type", "sorted"];
  var SCHLUESSEL_DOPPELPUNKT = /^(for|while|if|elif|else|def|class|try|except|finally|with)\b/;

  /* ---------- kleine Werkzeuge ---------------------------------- */

  function abstand(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  // ähnlichster Name: zuerst gleiche Schreibung ohne Gross/Klein, dann Tippfehler-Abstand
  function aehnlich(name, kandidaten) {
    var klein = name.toLowerCase(), best = null, bestAbstand = Infinity;
    for (var i = 0; i < kandidaten.length; i++) {
      var k = kandidaten[i];
      if (k === name) continue;
      if (k.toLowerCase() === klein) return k;
      var a = abstand(klein, k.toLowerCase());
      if (a < bestAbstand) { bestAbstand = a; best = k; }
    }
    var grenze = name.length <= 3 ? 1 : name.length <= 6 ? 2 : 3;
    return bestAbstand <= grenze ? best : null;
  }
  function einzug(zeile) { return (zeile.match(/^[ \t]*/)[0]).replace(/\t/g, "        ").length; }

  // Zerlegt eine Zeile: Code ohne Kommentar, offene Klammern, unvollständige Zeichenkette
  function zerlege(zeile, stapel, nr) {
    var code = "", i = 0, c, q, fehler = null;
    while (i < zeile.length) {
      c = zeile[i];
      if (c === "#") break;
      if (c === "\"" || c === "'") {
        q = c; var ende = zeile.indexOf(q, i + 1);
        while (ende > 0 && zeile[ende - 1] === "\\") ende = zeile.indexOf(q, ende + 1);
        if (ende < 0) { fehler = fehler || { art: "anfuehrung", zeile: nr }; code += zeile.slice(i); break; }
        code += q + q; i = ende + 1; continue;
      }
      if ("([{".indexOf(c) >= 0) stapel.push({ z: c, zeile: nr });
      else if (")]}".indexOf(c) >= 0) {
        var offen = stapel.pop();
        if (!offen) fehler = fehler || { art: "klammerZuViel", zeile: nr, z: c };
        else if ("([{".indexOf(offen.z) !== ")]}".indexOf(c)) fehler = fehler || { art: "klammerFalsch", zeile: nr, z: c, offen: offen.z };
      }
      code += c; i++;
    }
    return { code: code.replace(/\s+$/, ""), fehler: fehler };
  }

  /* ---------- Syntax ------------------------------------------- */

  function pruefeSyntax(zeilen, gemeldet) {
    var stapel = [], vorher = null, start = null, ebenen = [0], tabs = false;
    var bis = Math.min(zeilen.length, Math.max(gemeldet || zeilen.length, 1));
    for (var nr = 1; nr <= bis; nr++) {
      var roh = zeilen[nr - 1];
      var fortsetzung = stapel.length > 0;
      var z = zerlege(roh, stapel, nr);
      if (z.fehler) return z.fehler;
      if (!z.code.trim()) continue;
      if (/^\s*\t/.test(roh)) tabs = true;
      var e = einzug(roh), text = z.code.trim();

      if (!fortsetzung && vorher) {
        if (/:$/.test(vorher.text)) {
          if (e <= vorher.e) return { art: "einrueckenFehlt", zeile: nr, vorher: vorher.nr };
          ebenen.push(e);
        } else if (e > vorher.e) {
          return { art: "einrueckenZuviel", zeile: nr, vorher: vorher.nr };
        } else if (e < vorher.e) {
          while (ebenen.length && ebenen[ebenen.length - 1] > e) ebenen.pop();
          if (ebenen[ebenen.length - 1] !== e) return { art: "einrueckenUneben", zeile: nr, tabs: tabs };
        }
      }
      if (!fortsetzung) {
        start = { text: text, e: e, nr: nr };
        if (/^(if|elif|while)\b/.test(text) && /[^=!<>]=[^=]/.test(text.replace(/^(if|elif|while)\b/, " ")))
          return { art: "vergleich", zeile: nr };
        if (/^print\s+["'\w]/.test(text)) return { art: "printKlammer", zeile: nr };
      }
      if (stapel.length === 0) {
        // Anweisung fertig (bei mehrzeiligen Klammern begann sie weiter oben)
        var ganz = fortsetzung ? start.text + " " + text : text;
        if (SCHLUESSEL_DOPPELPUNKT.test(start.text) && ganz.indexOf(":") < 0) return { art: "doppelpunkt", zeile: nr };
        vorher = { text: text, e: start.e, nr: start.nr };
      }
    }
    if (stapel.length) return { art: "klammerOffen", zeile: stapel[0].zeile, z: stapel[0].z };
    return tabs ? { art: "tabs", zeile: gemeldet } : null;
  }

  var SYNTAX = {
    doppelpunkt: { was: "Am Ende der Zeile fehlt ein Doppelpunkt.",
      tipp: "Zeilen mit for, while, if, else, def enden mit «:».",
      beispiel: { falsch: "for i in range(4)", richtig: "for i in range(4):" } },
    einrueckenFehlt: { was: "Diese Zeile müsste eingerückt sein.",
      tipp: "Nach einer Zeile mit Doppelpunkt rücken die Zeilen, die dazugehören, um 4 Leerzeichen ein (Tab-Taste).",
      beispiel: { falsch: "for i in range(4):\nforward(100)", richtig: "for i in range(4):\n    forward(100)" } },
    einrueckenZuviel: { was: "Diese Zeile ist eingerückt, aber die Zeile davor endet nicht mit einem Doppelpunkt.",
      tipp: "Einrücken nur nach for, while, if, def … mit «:». Sonst beginnt die Zeile ganz links (oder auf derselben Höhe wie die Zeile davor).",
      beispiel: { falsch: "forward(100)\n    left(90)", richtig: "forward(100)\nleft(90)" } },
    einrueckenUneben: { was: "Die Einrückung passt zu keiner Zeile darüber.",
      tipp: "Zeilen, die zusammengehören, beginnen genau gleich weit rechts. Zählen Sie die Leerzeichen am Anfang.",
      beispiel: { falsch: "if x > 0:\n    print(\"positiv\")\n  else:\n    print(\"nicht positiv\")",
        richtig: "if x > 0:\n    print(\"positiv\")\nelse:\n    print(\"nicht positiv\")" } },
    vergleich: { was: "Für einen Vergleich braucht es zwei Gleichheitszeichen.",
      tipp: "«=» legt einen Wert fest, «==» vergleicht.",
      beispiel: { falsch: "if x = 3:", richtig: "if x == 3:" } },
    printKlammer: { was: "print braucht Klammern.",
      tipp: "In Python 3 ist print ein Befehl wie alle anderen.",
      beispiel: { falsch: "print \"Hallo\"", richtig: "print(\"Hallo\")" } },
    anfuehrung: { was: "Ein Text wird mit einem Anführungszeichen begonnen, aber nicht beendet.",
      tipp: "Jeder Text steht zwischen zwei gleichen Anführungszeichen: \"…\" oder '…'.",
      beispiel: { falsch: "print(\"Hallo)", richtig: "print(\"Hallo\")" } },
    klammerOffen: { was: "Hier wird eine Klammer geöffnet, aber nicht geschlossen.",
      tipp: "Zählen Sie die Klammern: Zu jeder «(» gehört eine «)». Python merkt das oft erst in der nächsten Zeile.",
      beispiel: { falsch: "forward(100", richtig: "forward(100)" } },
    klammerZuViel: { was: "Diese Zeile schliesst eine Klammer, die nie geöffnet wurde.",
      tipp: "Zählen Sie die Klammern: Gleich viele «(» wie «)».",
      beispiel: { falsch: "forward(100))", richtig: "forward(100)" } },
    klammerFalsch: { was: "Die Klammern passen nicht zusammen.",
      tipp: "Runde «( )», eckige «[ ]» und geschweifte «{ }» Klammern werden mit derselben Art geschlossen.",
      beispiel: { falsch: "farben = [\"red\", \"blue\")", richtig: "farben = [\"red\", \"blue\"]" } },
    tabs: { was: "Python versteht die Zeile nicht. Im Programm sind Tabulatoren und Leerzeichen gemischt.",
      tipp: "Rücken Sie überall mit 4 Leerzeichen ein. Im Editor macht die Tab-Taste das automatisch.",
      beispiel: null }
  };

  /* ---------- Namen aus dem Programm ---------------------------- */

  function definierteNamen(zeilen) {
    var namen = {}, re = [
      /^\s*([A-Za-z_]\w*)\s*(?:[+\-*/]?=)(?!=)/, /^\s*def\s+([A-Za-z_]\w*)/, /^\s*for\s+([A-Za-z_]\w*)\s+in\b/,
      /^\s*import\s+([A-Za-z_]\w*)/, /^\s*class\s+([A-Za-z_]\w*)/
    ];
    zeilen.forEach(function (z, i) {
      re.forEach(function (r) { var m = z.match(r); if (m && !(m[1] in namen)) namen[m[1]] = i + 1; });
      var d = z.match(/^\s*def\s+\w+\s*\(([^)]*)\)/);
      if (d) d[1].split(",").forEach(function (p) { p = p.split("=")[0].trim(); if (p && !(p in namen)) namen[p] = i + 1; });
    });
    return namen;
  }
  // Name der Turtle, wenn das Programm mit Objekten arbeitet (t = turtle.Turtle()), sonst null
  function turtleName(zeilen) {
    for (var i = 0; i < zeilen.length; i++) {
      var m = zeilen[i].match(/^\s*([A-Za-z_]\w*)\s*=\s*(?:turtle\.)?Turtle\s*\(/);
      if (m) return m[1];
    }
    return null;
  }
  function sternImport(zeilen) {
    return zeilen.some(function (z) { return /^\s*from\s+turtle\s+import\s+\*/.test(z); });
  }
  function befehl(tn, name) { return (tn ? tn + "." : "") + name; }
  function funktionUm(zeilen, nr) {
    var e = einzug(zeilen[nr - 1] || "");
    for (var i = nr - 2; i >= 0; i--) {
      if (!zeilen[i].trim()) continue;
      var ei = einzug(zeilen[i]);
      if (ei < e) {
        var m = zeilen[i].match(/^\s*def\s+([A-Za-z_]\w*)/);
        if (m) return m[1];
        e = ei;
        if (ei === 0) return null;
      }
    }
    return null;
  }

  /* ---------- Laufzeitfehler ------------------------------------ */

  function nameFehler(n, zeilen, nr) {
    var tn = turtleName(zeilen), stern = sternImport(zeilen), namen = definierteNamen(zeilen), zeile = zeilen[nr - 1] || "";
    var importiert = stern || zeilen.some(function (z) { return /^\s*import\s+turtle\b/.test(z); });
    var r = { was: "Python kennt den Namen «" + n + "» nicht.", tipp: null, beispiel: null };
    var bekannt = TURTLE_BEFEHLE.indexOf(n) >= 0 || TURTLE_MODUL.indexOf(n) >= 0;
    if (n === "turtle" && stern) {
      r.tipp = "Mit «from turtle import *» schreiben Sie die Befehle ohne «turtle.» davor.";
      r.beispiel = { falsch: "turtle.forward(100)", richtig: "forward(100)" };
    } else if (!importiert && (n === "turtle" || bekannt)) {
      r.tipp = "Am Anfang des Programms fehlt «from turtle import *».";
      r.beispiel = { falsch: n === "turtle" ? "turtle.forward(100)" : n + "(…)", richtig: "from turtle import *\n\nforward(100)" };
    } else if (n === "Turtle" || n === "Screen") {
      r.tipp = "Schreiben Sie «turtle." + n + "()», also mit «turtle.» davor, oder beginnen Sie mit «from turtle import *».";
      r.beispiel = { falsch: "t = Turtle()", richtig: "t = turtle.Turtle()" };
    } else if (namen[n] && namen[n] > nr) {
      r.tipp = "«" + n + "» bekommt erst in Zeile " + namen[n] + " einen Wert. Python arbeitet das Programm von oben nach unten ab.";
    } else if (bekannt && tn) {
      r.tipp = "Turtle-Befehle stehen hinter dem Namen der Turtle: «" + tn + "." + n + "(…)».";
      r.beispiel = { falsch: n + "(100)", richtig: tn + "." + n + "(100)" };
    } else if (bekannt) {
      r.tipp = "Mit «import turtle» schreibt man «turtle." + n + "(…)». Einfacher: Beginnen Sie mit «from turtle import *», dann reicht «" + n + "(…)».";
    } else if (aehnlich(n, TURTLE_MODUL) && !aehnlich(n, Object.keys(namen).concat(EINGEBAUT))) {
      var v = aehnlich(n, TURTLE_MODUL);
      r.tipp = v.toLowerCase() === n.toLowerCase() ? "Befehle schreibt man klein: «" + befehl(tn, v) + "»." : "Meinten Sie «" + befehl(tn, v) + "»?";
      r.beispiel = { falsch: befehl(tn, n) + "(…)", richtig: befehl(tn, v) + "(…)" };
    } else {
      var vorschlag = aehnlich(n, Object.keys(namen).concat(EINGEBAUT));
      if (vorschlag && vorschlag.toLowerCase() === n.toLowerCase())
        r.tipp = "Achten Sie auf Gross- und Kleinschreibung: «" + vorschlag + "».";
      else if (vorschlag) r.tipp = "Meinten Sie «" + vorschlag + "»?";
      else if (/^[A-ZÄÖÜa-zäöü]+$/.test(n) && new RegExp("\\(\\s*" + n + "\\s*[,)]").test(zeile)) {
        r.tipp = "Ist «" + n + "» als Text gemeint? Dann gehört es in Anführungszeichen: \"" + n + "\".";
        r.beispiel = { falsch: "print(" + n + ")", richtig: "print(\"" + n + "\")" };
      } else r.tipp = "Tippfehler? Oder bekommt «" + n + "» nirgends einen Wert, zum Beispiel mit «" + n + " = …»?";
    }
    return r;
  }

  function attributFehler(objekt, attr, zeilen) {
    var r = { was: "«" + attr + "» gibt es für " + (objekt === "Turtle" ? "die Turtle" : objekt === "module" ? "dieses Modul" : "einen Wert vom Typ «" + objekt + "»") + " nicht.", tipp: null, beispiel: null };
    var liste = objekt === "Turtle" ? TURTLE_BEFEHLE : objekt === "module" ? TURTLE_MODUL : [];
    var v = aehnlich(attr, liste);
    if (v && v.toLowerCase() === attr.toLowerCase()) r.tipp = "Befehle schreibt man klein: «" + v + "».";
    else if (v) r.tipp = "Meinten Sie «" + v + "»?";
    else if (objekt === "Turtle") r.tipp = "Häufige Befehle: forward, back, left, right, penup, pendown, goto, color, circle.";
    else if (objekt === "str") r.tipp = "Hier steht Text, wo ein anderer Wert erwartet wird. Wurde eine Variable mit einem Text überschrieben?";
    if (v) {
      var tn = objekt === "Turtle" ? turtleName(zeilen) || "t" : "turtle";
      r.beispiel = { falsch: tn + "." + attr + "(…)", richtig: tn + "." + v + "(…)" };
    }
    return r;
  }

  function typFehler(n, zeilen) {
    var m;
    if (/cannot concatenate 'str' and '(int|float)'|unsupported operand type\(s\) for \+: '(int|float)' and 'str'|can only concatenate str/.test(n))
      return { was: "Text und Zahl lassen sich nicht mit + verbinden.",
        tipp: "str(zahl) macht aus einer Zahl Text, int(text) aus Text eine Zahl. Was input() liefert, ist immer Text.",
        beispiel: { falsch: "alter = input(\"Alter? \")\nprint(alter + 1)", richtig: "alter = int(input(\"Alter? \"))\nprint(alter + 1)" } };
    if ((m = n.match(/(\w+)\(\) missing (\d+) required/)))
      return { was: "Dem Befehl «" + m[1] + "» fehlt ein Wert in der Klammer.",
        tipp: "Schreiben Sie den Wert in die Klammer, zum Beispiel «" + m[1] + "(100)».",
        beispiel: m[1] === "forward" ? { falsch: "forward()", richtig: "forward(100)" } : null };
    if ((m = n.match(/(\w+)\(\) takes .*?(\d+).*?\((\d+) given\)|(\w+)\(\) takes .*?(\d+) positional arguments? but (\d+) (?:were|was) given/)))
      return { was: "Der Befehl «" + (m[1] || m[4]) + "» bekommt zu viele oder zu wenige Werte in der Klammer.",
        tipp: "Werte in der Klammer werden mit Komma getrennt. Prüfen Sie, wie viele der Befehl braucht.", beispiel: null };
    if (/'float' object cannot be interpreted as an integer/.test(n))
      return { was: "Hier braucht es eine ganze Zahl, aber es kommt eine Kommazahl.",
        tipp: "range() zählt nur in ganzen Zahlen. «/» ergibt immer eine Kommazahl, «//» eine ganze; int(…) schneidet die Stellen nach dem Komma ab.",
        beispiel: { falsch: "for i in range(360 / 7):", richtig: "for i in range(360 // 7):" } };
    if ((m = n.match(/'(\w+)' object is not callable/)))
      return { was: "Hinter einem Wert vom Typ «" + m[1] + "» steht eine Klammer, als wäre er ein Befehl.",
        tipp: "Fehlt ein Rechenzeichen, etwa «2 * (3 + 4)» statt «2(3 + 4)»? Oder hat eine Variable denselben Namen wie ein Befehl (z. B. print = 5)?",
        beispiel: { falsch: "x = 2(3 + 4)", richtig: "x = 2 * (3 + 4)" } };
    if ((m = n.match(/'(\w+)' object is not iterable/)))
      return { was: "«for … in» braucht etwas zum Durchlaufen, zum Beispiel range(…) oder eine Liste.",
        tipp: "Für eine Anzahl Wiederholungen: «for i in range(5):».",
        beispiel: { falsch: "for i in 5:", richtig: "for i in range(5):" } };
    if (/unsupported operand/.test(n))
      return { was: "Diese Rechnung geht mit diesen Werten nicht.",
        tipp: "Sind alle Werte Zahlen? Text aus input() zuerst mit int(…) umwandeln.", beispiel: null };
    return { was: "Ein Wert hat den falschen Typ, zum Beispiel Text statt Zahl.",
      tipp: "Was input() liefert, ist Text; int(…) macht daraus eine ganze Zahl.", beispiel: null };
  }

  function laufzeitFehler(art, n, zeilen, nr) {
    var m;
    switch (art) {
      case "NameError":
        m = n.match(/name '(.+?)' is not defined/);
        return nameFehler(m ? m[1] : "?", zeilen, nr);
      case "AttributeError":
        m = n.match(/'(\w+)' object has no attribute '(\w+)'/) || n.match(/module '?(\w+)'? has no attribute '(\w+)'/);
        if (m && /^module/.test(n)) return attributFehler("module", m[2], zeilen);
        return m ? attributFehler(m[1], m[2], zeilen) : { was: "Diesen Befehl gibt es hier nicht.", tipp: null, beispiel: null };
      case "TypeError": return typFehler(n, zeilen);
      case "ValueError":
        if ((m = n.match(/invalid literal for int\(\) with base 10: '(.*)'/)))
          return { was: "«" + m[1] + "» lässt sich nicht in eine ganze Zahl umwandeln.",
            tipp: "int(…) versteht nur Ziffern: «10» geht, «zehn» oder «10.5» nicht. Bei Kommazahlen: float(…).", beispiel: null };
        return { was: "Der Wert passt hier nicht.", tipp: null, beispiel: null };
      case "ZeroDivisionError":
        return { was: "Hier wird durch 0 geteilt. Das geht auch in Python nicht.",
          tipp: "Welche Variable ist hier 0? Mit print(…) davor lässt sich das nachprüfen.", beispiel: null };
      case "IndexError":
        return { was: "Diese Stelle gibt es in der Liste nicht.",
          tipp: "Gezählt wird ab 0: Eine Liste mit 3 Elementen hat die Stellen 0, 1 und 2.",
          beispiel: { falsch: "farben = [\"red\", \"blue\"]\nprint(farben[2])", richtig: "farben = [\"red\", \"blue\"]\nprint(farben[1])" } };
      case "ImportError":
      case "ModuleNotFoundError":
        m = n.match(/No module named '?(\w+)'?/);
        if (m && m[1].toLowerCase() === "turtle" && m[1] !== "turtle")
          return { was: "Das Modul heisst «turtle», klein geschrieben.", tipp: null, beispiel: { falsch: (zeilen[nr - 1] || "").trim(), richtig: (zeilen[nr - 1] || "").trim().replace(m[1], "turtle") } };
        return { was: "Das Modul «" + (m ? m[1] : "?") + "» gibt es hier nicht.",
          tipp: "Verfügbar sind unter anderem turtle, random, math und time.", beispiel: null };
      case "RecursionError":
      case "RangeError":
        return { was: "Eine Funktion ruft sich immer wieder selbst auf, ohne aufzuhören.",
          tipp: "Es braucht eine Bedingung, bei der die Funktion sich nicht mehr selbst aufruft.", beispiel: null };
      case "KeyError":
        return { was: "Diesen Schlüssel gibt es im Wörterbuch (dict) nicht.", tipp: null, beispiel: null };
      case "TurtleGraphicsError":
        return { was: "Die Turtle kann mit diesem Wert nichts anfangen.",
          tipp: "Farben auf Englisch und in Anführungszeichen, zum Beispiel \"red\" oder \"#ff8800\".", beispiel: null };
    }
    return { was: "Beim Ausführen ist ein Fehler aufgetreten.", tipp: null, beispiel: null };
  }

  var MEHR = {
    SyntaxError: "Ein Syntaxfehler heisst: Python versteht die Schreibweise nicht und startet das Programm gar nicht erst. Die markierte Zeile ist ein Hinweis; die Ursache steht oft am Ende der Zeile davor.",
    NameError: "Ein Name ist unbekannt, wenn er nie einen Wert bekommen hat, falsch geschrieben ist oder erst weiter unten festgelegt wird. Python unterscheidet Gross- und Kleinschreibung.",
    AttributeError: "Mit dem Punkt ruft man einen Befehl eines Objekts auf, etwa turtle.forward(100) oder t.forward(100). Diesen Befehl gibt es dort nicht, meist wegen eines Tippfehlers.",
    TypeError: "Werte haben einen Typ: ganze Zahl (int), Kommazahl (float), Text (str) … Nicht jeder Befehl und nicht jede Rechnung funktioniert mit jedem Typ.",
    ValueError: "Der Typ stimmt, aber der Inhalt passt nicht, zum Beispiel Text ohne Ziffern für int().",
    ZeroDivisionError: "Teilen durch 0 ist nicht definiert.",
    IndexError: "Listen werden ab 0 gezählt. Die letzte Stelle ist len(liste) - 1.",
    ImportError: "Mit import lädt man ein Modul. Modulnamen schreibt man klein."
  };
  MEHR.IndentationError = MEHR.SyntaxError; MEHR.TabError = MEHR.SyntaxError; MEHR.ModuleNotFoundError = MEHR.ImportError;

  /* ---------- Einstieg ------------------------------------------ */

  function analysiere(f) {
    var zeilen = String(f.code || "").split("\n");
    var stapel = (f.stapel || []).filter(function (z) { return typeof z === "number" && z >= 1; });
    var nr = stapel[0] || null;
    var art = f.art || "Fehler", n = String(f.nachricht || "");
    var r, zeile = nr, syntax = art === "SyntaxError" || art === "IndentationError" || art === "TabError";

    if (syntax) {
      var s = pruefeSyntax(zeilen, nr);
      if (s && SYNTAX[s.art]) {
        r = { was: SYNTAX[s.art].was, tipp: SYNTAX[s.art].tipp, beispiel: SYNTAX[s.art].beispiel };
        if (s.zeile) zeile = s.zeile;
        if (s.art === "einrueckenFehlt") r.was = "Zeile " + s.zeile + " müsste eingerückt sein, weil Zeile " + s.vorher + " mit einem Doppelpunkt endet.";
      } else {
        r = { was: "Python versteht die Schreibweise dieser Zeile nicht" + (/bad input/.test(n) ? "." : ": " + n),
          tipp: "Häufige Ursachen: fehlender Doppelpunkt, eine Klammer oder ein Anführungszeichen zu wenig, falsche Einrückung, auch in der Zeile davor.",
          beispiel: null };
      }
    } else {
      r = laufzeitFehler(art, n, zeilen, nr || 1);
    }

    // Syntaxfehler: Das Programm lief gar nicht, darum ohne Aufrufverlauf
    var verlauf = syntax ? [] : stapel.slice().reverse().map(function (z) {
      return { zeile: z, funktion: funktionUm(zeilen, z), text: (zeilen[z - 1] || "").trim() };
    });
    var ort = zeile ? "Zeile " + zeile : "";
    if (stapel.length > 1 && zeile === stapel[0]) {
      var fn = funktionUm(zeilen, stapel[0]);
      ort += (fn ? " in der Funktion «" + fn + "»" : "") + ", aufgerufen in Zeile " + stapel[stapel.length - 1];
    }
    r.zeile = zeile;
    r.ort = ort;
    r.mehr = MEHR[art] || null;
    r.verlauf = verlauf;
    return r;
  }

  var api = { analysiere: analysiere, pruefeSyntax: pruefeSyntax, aehnlich: aehnlich };
  if (typeof module === "object" && module.exports) module.exports = api;
  else wurzel.TurtleFehlerhilfe = api;
})(this);
