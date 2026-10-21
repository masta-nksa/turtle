/* ============================================================
   doku.js – Doku: Befehle und Anleitungen nachschlagen und durchsuchen.
   Seitenleiste rechts, liegt über der Seite (nichts verschiebt sich); der Editor bleibt bedienbar.
   Daten und Suche in befehle.js. Beispiele werden bewusst nicht eingefügt: abtippen.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var B = window.TurtleBefehle;
  var panel = $("doku"), suchfeld = $("dokuSuche"), liste = $("dokuListe"), info = $("dokuInfo"), wahl = $("dokuGruppe");
  var opener = null;

  var SCHLUESSEL = ["for", "in", "range", "while", "if", "elif", "else", "def", "return", "import", "from", "and", "or",
    "not", "True", "False", "None", "break", "continue", "global", "print", "input", "int", "str", "float", "len"];
  var EINGEBAUT = { range: 1, print: 1, input: 1, int: 1, str: 1, float: 1, len: 1 };

  // Einfaches Einfärben wie im Editor (Schlüsselwörter, Texte, Zahlen, Kommentare, Namen nach def)
  function einfaerben(code) {
    var pre = document.createElement("pre");
    pre.className = "tu-doku-bsp cm-s-default";
    var re = /(#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g, m, pos = 0, nachDef = false;
    function stueck(text, klasse) {
      if (!klasse) { pre.append(text); return; }
      var s = document.createElement("span"); s.className = klasse; s.textContent = text; pre.append(s);
    }
    while ((m = re.exec(code))) {
      if (m.index > pos) stueck(code.slice(pos, m.index));
      var k = null;
      if (m[1]) k = "cm-comment";
      else if (m[2]) k = "cm-string";
      else if (m[3]) k = "cm-number";
      else if (nachDef) k = "cm-def";
      else if (EINGEBAUT[m[4]]) k = "cm-builtin";
      else if (SCHLUESSEL.indexOf(m[4]) >= 0) k = "cm-keyword";
      nachDef = m[4] === "def";
      stueck(m[0], k);
      pos = re.lastIndex;
    }
    if (pos < code.length) stueck(code.slice(pos));
    return pre;
  }

  function eintragEl(e, mitGruppe) {
    var d = document.createElement("details");
    d.className = "tu-doku-eintrag" + (e.art === "anleitung" ? " anleitung" : "");
    d.id = "doku-" + e.id;
    var su = document.createElement("summary");
    var kopf = document.createElement(e.art === "anleitung" ? "b" : "code");
    kopf.textContent = e.art === "anleitung" ? e.titel : e.aufruf;
    su.append(kopf);
    if (mitGruppe) {
      var g = document.createElement("small"); g.textContent = e.art === "anleitung" ? "Anleitung" : e.gruppe; su.append(" ", g);
    }
    var t = document.createElement("span"); t.textContent = e.text; su.append(t);
    d.append(su);

    var inhalt = document.createElement("div");
    inhalt.className = "tu-doku-inhalt";
    if (e.namen.length > 1) {
      var kurz = document.createElement("p");
      kurz.textContent = "Auch: " + e.namen.slice(1).join(", ");
      inhalt.append(kurz);
    }
    if (e.bsp) inhalt.append(einfaerben(e.bsp));
    if (e.siehe.length) {
      var p = document.createElement("p");
      p.className = "tu-doku-siehe";
      p.append(e.art === "anleitung" ? "Befehle: " : "Siehe auch: ");
      e.siehe.forEach(function (n) {
        if (!B.nachName[n]) return;
        var b = document.createElement("button");
        b.type = "button"; b.className = "tu-dokulink"; b.textContent = n;
        b.addEventListener("click", function () { zeige(n); });
        p.append(b, " ");
      });
      inhalt.append(p);
    }
    d.append(inhalt);
    return d;
  }

  function zeichnen() {
    var q = suchfeld.value.trim();
    liste.textContent = "";
    wahl.hidden = !!q;
    if (q) {
      var treffer = B.suche(q);
      info.textContent = treffer.length === 1 ? "1 Treffer" : treffer.length ? treffer.length + " Treffer"
        : "Nichts gefunden. Versuchen Sie z. B. «Kreis» oder «Farbe».";
      treffer.forEach(function (e, i) {
        var el = eintragEl(e, true);
        if (i === 0) el.open = true;
        liste.append(el);
      });
      return;
    }
    info.textContent = "Stichwort eingeben oder unten blättern.";
    B.gruppen.forEach(function (g, gi) {
      var h = document.createElement("h3");
      h.id = "dokuG" + gi; h.textContent = g;
      liste.append(h);
      B.eintraege.forEach(function (e) { if (e.gruppe === g) liste.append(eintragEl(e, false)); });
    });
  }

  B.gruppen.forEach(function (g, gi) {
    var o = document.createElement("option"); o.value = "dokuG" + gi; o.textContent = g; wahl.append(o);
  });
  wahl.addEventListener("change", function () {
    var h = $(wahl.value);
    if (h) liste.scrollTop = h.offsetTop - liste.offsetTop;
    wahl.value = "";
  });

  var suchTimer = null;
  suchfeld.addEventListener("input", function () {
    clearTimeout(suchTimer);
    suchTimer = setTimeout(function () { zeichnen(); liste.scrollTop = 0; }, 120);
  });
  suchfeld.addEventListener("keydown", function (e) {
    // Eingabetaste: zum ersten Treffer
    if (e.key === "Enter") { e.preventDefault(); clearTimeout(suchTimer); zeichnen(); var s = liste.querySelector("summary"); if (s) s.focus(); }
  });

  function oeffnen() {
    if (panel.hidden) {
      opener = document.activeElement;
      panel.hidden = false;
      $("knopfDoku").setAttribute("aria-expanded", "true");
      if (!liste.firstChild) zeichnen();
    }
  }
  function schliessen() {
    panel.hidden = true;
    $("knopfDoku").setAttribute("aria-expanded", "false");
    if (opener && document.contains(opener) && opener.offsetParent !== null) opener.focus();
    opener = null;
  }

  // Einen Befehl zeigen (aus Kurzhilfe, Fehlerhilfe oder «Siehe auch»)
  function zeige(name) {
    var e = B.nachName[name];
    if (!e) return;
    oeffnen();
    if (suchfeld.value) { suchfeld.value = ""; }
    zeichnen();
    var el = $("doku-" + e.id);
    el.open = true;
    liste.scrollTop = el.offsetTop - liste.offsetTop - 8;
    el.classList.add("blinkt");
    setTimeout(function () { el.classList.remove("blinkt"); }, 1200);
    el.querySelector("summary").focus({ preventScroll: true });
  }

  $("knopfDoku").addEventListener("click", function () {
    if (!panel.hidden) { schliessen(); return; }
    oeffnen();
    suchfeld.focus();
    suchfeld.select();
  });
  $("dokuZu").addEventListener("click", schliessen);
  // Esc schliesst zuerst die Doku (vor dem Vollbild); nicht, wenn ein Dialog offen ist
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || panel.hidden || document.querySelector("dialog[open]")) return;
    e.stopPropagation();
    schliessen();
  }, true);

  window.TurtleDoku = { zeige: zeige, oeffnen: oeffnen };
})();
