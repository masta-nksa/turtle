/* ============================================================
   beispiele.js – Startprogramm und Beispiele (Menü «Beispiele …»).
   Ein Beispiel öffnet sich immer als neues Programm.
   Alle mit «from turtle import *»: Befehle ohne Objekt davor (forward statt t.forward).
   ============================================================ */
window.TurtleBeispiele = {
  neu: "from turtle import *\n\n",

  start:
    "# Willkommen! Ändern Sie die Zahlen und drücken Sie «Start».\n" +
    "from turtle import *\n\n" +
    "color(\"teal\")\n\n" +
    "for i in range(36):\n" +
    "    forward(150)\n" +
    "    left(170)\n",

  liste: [
    { name: "Quadrat", code:
      "from turtle import *\n\n" +
      "for i in range(4):\n" +
      "    forward(150)\n" +
      "    left(90)\n" },

    { name: "Treppe", code:
      "from turtle import *\n\n" +
      "penup()\n" +
      "goto(-200, -200)\n" +
      "pendown()\n\n" +
      "for stufe in range(8):\n" +
      "    forward(50)\n" +
      "    left(90)\n" +
      "    forward(50)\n" +
      "    right(90)\n" },

    { name: "Stern mit Füllung", code:
      "from turtle import *\n\n" +
      "color(\"orange\", \"gold\")\n" +
      "begin_fill()\n" +
      "for i in range(5):\n" +
      "    forward(200)\n" +
      "    right(144)\n" +
      "end_fill()\n" },

    { name: "Farbige Spirale", code:
      "from turtle import *\n\n" +
      "pensize(2)\n" +
      "farben = [\"red\", \"orange\", \"gold\", \"green\", \"blue\", \"purple\"]\n\n" +
      "for i in range(100):\n" +
      "    pencolor(farben[i % len(farben)])\n" +
      "    forward(i * 2)\n" +
      "    left(59)\n" },

    { name: "Funktion: Vieleck", code:
      "from turtle import *\n\n" +
      "def vieleck(ecken, laenge):\n" +
      "    for i in range(ecken):\n" +
      "        forward(laenge)\n" +
      "        left(360 / ecken)\n\n" +
      "for ecken in range(3, 9):\n" +
      "    vieleck(ecken, 60)\n" },

    { name: "Eingabe mit input()", code:
      "from turtle import *\n\n" +
      "ecken = int(input(\"Wie viele Ecken? \"))\n" +
      "farbe = input(\"Welche Farbe (englisch, z. B. red)? \")\n\n" +
      "color(farbe)\n" +
      "for i in range(ecken):\n" +
      "    forward(120)\n" +
      "    left(360 / ecken)\n\n" +
      "print(\"Fertig:\", ecken, \"Ecken in\", farbe)\n" }
  ]
};
