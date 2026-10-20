/* ============================================================
   beispiele.js – Startprogramm und Beispiele (Menü «Beispiele …»).
   Ein Beispiel öffnet sich immer als neues Programm.
   ============================================================ */
window.TurtleBeispiele = {
  start:
    "# Willkommen! Ändern Sie die Zahlen und drücken Sie «Start».\n" +
    "import turtle\n\n" +
    "t = turtle.Turtle()\n" +
    "t.color(\"teal\")\n\n" +
    "for i in range(36):\n" +
    "    t.forward(150)\n" +
    "    t.left(170)\n",

  liste: [
    { name: "Quadrat", code:
      "import turtle\n\n" +
      "t = turtle.Turtle()\n\n" +
      "for i in range(4):\n" +
      "    t.forward(150)\n" +
      "    t.left(90)\n" },

    { name: "Treppe", code:
      "import turtle\n\n" +
      "t = turtle.Turtle()\n" +
      "t.penup()\n" +
      "t.goto(-200, -200)\n" +
      "t.pendown()\n\n" +
      "for stufe in range(8):\n" +
      "    t.forward(50)\n" +
      "    t.left(90)\n" +
      "    t.forward(50)\n" +
      "    t.right(90)\n" },

    { name: "Stern mit Füllung", code:
      "import turtle\n\n" +
      "t = turtle.Turtle()\n" +
      "t.color(\"orange\", \"gold\")\n" +
      "t.begin_fill()\n" +
      "for i in range(5):\n" +
      "    t.forward(200)\n" +
      "    t.right(144)\n" +
      "t.end_fill()\n" },

    { name: "Farbige Spirale", code:
      "import turtle\n\n" +
      "t = turtle.Turtle()\n" +
      "t.pensize(2)\n" +
      "farben = [\"red\", \"orange\", \"gold\", \"green\", \"blue\", \"purple\"]\n\n" +
      "for i in range(100):\n" +
      "    t.pencolor(farben[i % len(farben)])\n" +
      "    t.forward(i * 2)\n" +
      "    t.left(59)\n" },

    { name: "Funktion: Vieleck", code:
      "import turtle\n\n" +
      "t = turtle.Turtle()\n\n" +
      "def vieleck(ecken, laenge):\n" +
      "    for i in range(ecken):\n" +
      "        t.forward(laenge)\n" +
      "        t.left(360 / ecken)\n\n" +
      "for ecken in range(3, 9):\n" +
      "    vieleck(ecken, 60)\n" },

    { name: "Eingabe mit input()", code:
      "import turtle\n\n" +
      "ecken = int(input(\"Wie viele Ecken? \"))\n" +
      "farbe = input(\"Welche Farbe (englisch, z. B. red)? \")\n\n" +
      "t = turtle.Turtle()\n" +
      "t.color(farbe)\n" +
      "for i in range(ecken):\n" +
      "    t.forward(120)\n" +
      "    t.left(360 / ecken)\n\n" +
      "print(\"Fertig:\", ecken, \"Ecken in\", farbe)\n" }
  ]
};
