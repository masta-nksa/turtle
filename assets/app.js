/* ============================================================
   app.js – Editor, Speichern im Browser, Teilen per Link und Ablauf.
   Das Programm selbst läuft in laufzeit/skulpt.html (Sandbox-iframe).
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var SPEICHER = "turtle.programme.v1";
  var SPEICHER_TEMPO = "turtle.tempo.v1";
  var LINK_PRAEFIX = "#programm=";
  var LINK_WARNUNG = 6000;          // ab dieser Länge kürzen manche Chat- und Mailprogramme
  var CODE_MAX = 100000;

  // Wie in Kara: sieben Stufen, «mittel» ist die Vorgabe. Faktor auf das Tempo aus speed();
  // Skulpt zeichnet bei Faktor 1 etwa dreimal langsamer als Python auf dem Computer.
  var TEMPO = [0.5, 1, 3, 6, 12, 30, Infinity];
  var TEMPO_TEXT = ["sehr langsam", "langsam", "mittel", "schnell", "sehr schnell", "blitzschnell", "Turbo"];

  var BEISPIELE = window.TurtleBeispiele;

  /* ---------- Speicher ---------------------------------------- */

  var db = { programme: {}, aktuell: null };
  var speicherOk = true;

  function laden() {
    try {
      var d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
      if (d && d.programme && typeof d.programme === "object") db = d;
    } catch (e) { speicherOk = false; }
  }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(db)); return true; }
    catch (e) { speicherOk = false; return false; }
  }

  function kennung() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* weiter */ }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function pruefsumme(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function neuesProgramm(name, code, quelle) {
    var p = { id: kennung(), name: name || "Neues Programm", code: code, geaendert: Date.now() };
    if (quelle) p.quelle = quelle;
    db.programme[p.id] = p;
    return p;
  }
  function aktuell() { return db.programme[db.aktuell]; }
  function sortiert() {
    return Object.keys(db.programme)
      .map(function (id) { return db.programme[id]; })
      .sort(function (a, b) { return b.geaendert - a.geaendert; });
  }

  /* ---------- Kopf ---------------------------------------------- */

  var rule = $("pixelrule");
  for (var pi = 0; pi < 40; pi++) rule.append(document.createElement("i"));

  /* ---------- Editor -------------------------------------------- */

  var editor = CodeMirror.fromTextArea($("code"), {
    mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, smartIndent: true,
    autoCloseBrackets: true, matchBrackets: true,
    extraKeys: {
      Tab: function (cm) {
        if (cm.somethingSelected()) cm.indentSelection("add");
        else cm.replaceSelection("    ", "end");
      },
      "Shift-Tab": function (cm) { cm.indentSelection("subtract"); },
      "Ctrl-Enter": function () { neuStarten(); },
      "Cmd-Enter": function () { neuStarten(); }
    }
  });
  ["autocapitalize", "autocorrect"].forEach(function (a) { editor.getInputField().setAttribute(a, "off"); });
  editor.getInputField().setAttribute("spellcheck", "false");

  var speicherTimer = null, ladend = false;

  function zeit(ts) {
    try { return new Date(ts).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function datum(ts) {
    try { return new Date(ts).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" }); }
    catch (e) { return ""; }
  }

  function aenderung() {
    if (ladend) return;
    $("gespeichert").textContent = "…";
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(sofortSpeichern, 400);
    teilenZuruecksetzen();
  }
  function sofortSpeichern() {
    clearTimeout(speicherTimer); speicherTimer = null;
    var p = aktuell(); if (!p) return;
    p.code = editor.getValue();
    p.name = $("name").value.trim() || "Ohne Namen";
    p.geaendert = Date.now();
    if (speichern()) $("gespeichert").textContent = "Gespeichert in diesem Browser · " + zeit(p.geaendert);
    else $("gespeichert").textContent = "Nicht gespeichert: Dieser Browser erlaubt es nicht (privates Fenster?). Bitte herunterladen.";
  }
  editor.on("change", aenderung);
  $("name").addEventListener("input", aenderung);
  window.addEventListener("pagehide", function () { if (speicherTimer) sofortSpeichern(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && speicherTimer) sofortSpeichern(); });

  function oeffnen(id) {
    if (speicherTimer) sofortSpeichern();
    zuruecksetzen();
    db.aktuell = id;
    var p = aktuell();
    ladend = true;
    editor.setValue(p.code);
    editor.clearHistory();
    $("name").value = p.name;
    ladend = false;
    teilenZuruecksetzen();
    speichern();
    $("gespeichert").textContent = speicherOk ? "Gespeichert in diesem Browser · " + zeit(p.geaendert)
      : "Nicht gespeichert: Dieser Browser erlaubt es nicht (privates Fenster?). Bitte herunterladen.";
  }

  /* ---------- Beispiele und Neu --------------------------------- */

  var wahl = $("beispiele");
  BEISPIELE.liste.forEach(function (b, i) {
    var o = document.createElement("option"); o.value = String(i); o.textContent = b.name; wahl.append(o);
  });
  wahl.addEventListener("change", function () {
    var b = BEISPIELE.liste[Number(wahl.value)];
    wahl.value = "";
    if (!b) return;
    var p = neuesProgramm(b.name, b.code);
    speichern(); oeffnen(p.id);
  });
  $("knopfNeu").addEventListener("click", function () {
    var p = neuesProgramm("Neues Programm", "import turtle\n\nt = turtle.Turtle()\n");
    speichern(); oeffnen(p.id);
    editor.focus(); editor.setCursor(editor.lineCount(), 0);
  });

  /* ---------- Meine Programme ----------------------------------- */

  function listeZeigen() {
    var ul = $("liste"); ul.textContent = "";
    sortiert().forEach(function (p) {
      var li = document.createElement("li");
      if (p.id === db.aktuell) li.setAttribute("aria-current", "true");
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = p.name;
      var dt = document.createElement("span"); dt.className = "dt"; dt.textContent = datum(p.geaendert);
      var auf = document.createElement("button"); auf.type = "button"; auf.className = "bk-knopf"; auf.textContent = "Öffnen";
      auf.addEventListener("click", function () { oeffnen(p.id); $("programmeDialog").close(); });
      var weg = document.createElement("button"); weg.type = "button"; weg.className = "bk-knopf"; weg.textContent = "Löschen";
      weg.addEventListener("click", function () {
        if (!confirm("Programm «" + p.name + "» löschen? Das lässt sich nicht rückgängig machen.")) return;
        delete db.programme[p.id];
        if (p.id === db.aktuell) {
          var rest = sortiert();
          oeffnen(rest.length ? rest[0].id : neuesProgramm("Mein erstes Programm", BEISPIELE.start).id);
        }
        speichern(); listeZeigen();
      });
      li.append(nm, dt, auf, weg); ul.append(li);
    });
  }
  $("knopfProgramme").addEventListener("click", function () {
    if (speicherTimer) sofortSpeichern();
    listeZeigen(); $("programmeDialog").showModal();
  });
  $("programmeZu").addEventListener("click", function () { $("programmeDialog").close(); });

  function dateiSpeichern(name, text, typ) {
    var blob = new Blob([text], { type: typ || "text/x-python;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function dateiname(s) {
    return (s || "programm").normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 40) || "programm";
  }

  $("knopfLaden").addEventListener("click", function () {
    if (speicherTimer) sofortSpeichern();
    var n = dateiname(aktuell().name) + ".py";
    dateiSpeichern(n, editor.getValue());
    teilenMeldung("Heruntergeladen als «" + n + "».");
  });
  $("knopfSichern").addEventListener("click", function () {
    if (speicherTimer) sofortSpeichern();
    var daten = { turtle: 1, programme: sortiert().map(function (p) { return { name: p.name, code: p.code }; }) };
    dateiSpeichern("turtle-programme-" + new Date().toISOString().slice(0, 10) + ".json",
      JSON.stringify(daten, null, 1), "application/json");
  });
  $("knopfOeffnen").addEventListener("click", function () { $("datei").click(); });
  $("datei").addEventListener("change", function () {
    var f = this.files[0]; this.value = "";
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var text = String(r.result), neu = [];
      if (/\.json$/i.test(f.name)) {
        try {
          var d = JSON.parse(text);
          (d.programme || []).forEach(function (q) {
            if (q && typeof q.code === "string" && q.code.length <= CODE_MAX)
              neu.push(neuesProgramm(String(q.name || "Eingelesen").slice(0, 60), q.code));
          });
        } catch (e) { alert("Die Datei ist keine gültige Sicherung."); return; }
      } else if (text.length <= CODE_MAX) {
        neu.push(neuesProgramm(f.name.replace(/\.[^.]+$/, "").slice(0, 60), text));
      }
      if (!neu.length) { alert("In der Datei wurde kein Programm gefunden."); return; }
      speichern(); oeffnen(neu[neu.length - 1].id); listeZeigen();
    };
    r.readAsText(f);
  });

  /* ---------- Teilen per Link ----------------------------------- */

  function teilenMeldung(text) { var m = $("teilenMeldung"); m.textContent = text; m.hidden = !text; }
  function teilenZuruecksetzen() { $("teilenLink").hidden = true; teilenMeldung(""); }

  $("knopfTeilen").addEventListener("click", function () {
    if (speicherTimer) sofortSpeichern();
    var p = aktuell();
    var inhalt = LZString.compressToEncodedURIComponent(JSON.stringify({ n: p.name, c: editor.getValue() }));
    var link = location.origin + location.pathname + LINK_PRAEFIX + inhalt;
    var feld = $("teilenLink");
    feld.value = link; feld.hidden = false;
    feld.focus(); feld.select();
    var hinweis = "Wer den Link öffnet, erhält eine eigene Kopie; Ihr Programm bleibt unverändert.";
    if (link.length > LINK_WARNUNG) hinweis += " Der Link ist sehr lang (" + link.length + " Zeichen); manche Chat- und Mailprogramme kürzen ihn. Sicherer: «Herunterladen».";
    function ok() { teilenMeldung("Link kopiert. " + hinweis); }
    function vonHand() { teilenMeldung("Bitte den markierten Link selbst kopieren. " + hinweis); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(ok, vonHand);
    else vonHand();
  });

  var empfangen = null;
  function linkLesen() {
    if (location.hash.indexOf(LINK_PRAEFIX) !== 0) return;
    var roh = location.hash.slice(LINK_PRAEFIX.length), d = null;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* weiter */ }
    try { d = JSON.parse(LZString.decompressFromEncodedURIComponent(roh) || "null"); } catch (e) { d = null; }
    if (!d || typeof d.c !== "string" || d.c.length > CODE_MAX) {
      $("importText").textContent = "Der Link ist unvollständig oder beschädigt. Vermutlich wurde er beim Kopieren abgeschnitten.";
      $("importCode").hidden = true; $("importJa").hidden = true; $("importNein").textContent = "Schliessen";
      $("importDialog").showModal();
      return;
    }
    var quelle = pruefsumme(roh);
    var schon = sortiert().filter(function (p) { return p.quelle === quelle; })[0];
    if (schon) {
      oeffnen(schon.id);
      teilenMeldung("Dieses Programm haben Sie schon übernommen; Ihre Fassung ist geöffnet.");
      return;
    }
    var name = String(d.n || "Geteiltes Programm").slice(0, 60);
    empfangen = { name: name, code: d.c, quelle: quelle };
    $("importText").textContent = "«" + name + "» (" + d.c.split("\n").length + " Zeilen). Übernehmen legt eine Kopie bei Ihren Programmen an. Gestartet wird es erst, wenn Sie «Start» drücken.";
    $("importCode").textContent = d.c;
    $("importCode").hidden = false; $("importJa").hidden = false; $("importNein").textContent = "Ablehnen";
    $("importDialog").showModal();
  }
  $("importJa").addEventListener("click", function () {
    if (empfangen) {
      var p = neuesProgramm(empfangen.name, empfangen.code, empfangen.quelle);
      speichern(); oeffnen(p.id); empfangen = null;
    }
    $("importDialog").close();
  });
  $("importNein").addEventListener("click", function () { empfangen = null; $("importDialog").close(); });
  window.addEventListener("hashchange", linkLesen);

  /* ---------- Ablauf -------------------------------------------- */

  // zustand: "bereit" | "laeuft" | "pause" | "eingabe" | "fertig" | "fehler"
  var rahmen = null, zustand = "bereit", fehlerZeile = null;

  var ZUSTAND_TEXT = {
    bereit: "Bereit.", laeuft: "Läuft …", pause: "Pausiert.",
    eingabe: "Wartet auf Ihre Eingabe …", fertig: "Fertig.", fehler: "Abgebrochen wegen eines Fehlers."
  };
  function setzeZustand(z) {
    zustand = z;
    $("zustand").textContent = ZUSTAND_TEXT[z];
    var st = $("knopfStart");
    st.textContent = (z === "laeuft" || z === "eingabe") ? "Pause" : (z === "pause" ? "Weiter" : "Start");
    st.disabled = z === "eingabe";
  }

  function faktor() { return TEMPO[Number($("tempo").value) - 1] || 1; }
  function senden(m) { if (rahmen && rahmen.contentWindow) rahmen.contentWindow.postMessage(m, "*"); }

  function ausgeben(text, klasse) {
    var a = $("ausgabe"), knoten;
    if (klasse) { knoten = document.createElement("span"); knoten.className = klasse; knoten.textContent = text; }
    else knoten = document.createTextNode(text);
    a.append(knoten);
    a.scrollTop = a.scrollHeight;
  }

  function fehlerzeileWeg() {
    if (fehlerZeile !== null) { editor.removeLineClass(fehlerZeile, "background", "tu-fehlerzeile"); fehlerZeile = null; }
  }

  function zuruecksetzen() {
    if (rahmen) { rahmen.remove(); rahmen = null; }
    $("leer").hidden = false;
    $("ausgabe").textContent = "";
    $("meldung").hidden = true;
    $("eingabeZeile").hidden = true;
    fehlerzeileWeg();
    setzeZustand("bereit");
  }

  function neuStarten() {
    if (speicherTimer) sofortSpeichern();
    zuruecksetzen();
    var code = editor.getValue();
    rahmen = document.createElement("iframe");
    rahmen.title = "Turtle-Feld";
    // Ohne allow-same-origin: kein Zugriff auf localStorage dieser Seite
    rahmen.setAttribute("sandbox", "allow-scripts");
    rahmen.src = "laufzeit/skulpt.html";
    rahmen.dataset.code = code;
    $("feld").append(rahmen);
    $("leer").hidden = true;
    setzeZustand("laeuft");
  }

  $("knopfStart").addEventListener("click", function () {
    if (zustand === "laeuft") { senden({ typ: "pause" }); setzeZustand("pause"); }
    else if (zustand === "pause") { senden({ typ: "weiter" }); setzeZustand("laeuft"); }
    else neuStarten();
  });
  $("knopfReset").addEventListener("click", zuruecksetzen);

  var HILFE = {
    NameError: "Python kennt diesen Namen nicht. Tippfehler oder Gross-/Kleinschreibung? Fehlt «import turtle», oder bekommt die Variable erst weiter unten einen Wert?",
    SyntaxError: "Python versteht die Zeile nicht. Oft fehlt ein Doppelpunkt, eine Klammer oder ein Anführungszeichen, manchmal auch in der Zeile davor.",
    IndentationError: "Die Einrückung stimmt nicht. Nach einer Zeile mit Doppelpunkt (for, while, if, def) rücken die folgenden Zeilen um 4 Leerzeichen ein.",
    TypeError: "Ein Wert hat den falschen Typ, zum Beispiel Text statt Zahl. Was input() liefert, ist Text; int(…) macht daraus eine ganze Zahl.",
    AttributeError: "Diesen Befehl gibt es hier nicht. Stimmt der Name, zum Beispiel forward, left, penup?",
    ValueError: "Der Wert passt nicht, zum Beispiel int(\"zehn\").",
    ZeroDivisionError: "Hier wird durch 0 geteilt.",
    IndexError: "Diese Stelle gibt es in der Liste nicht. Zählen beginnt bei 0.",
    TurtleGraphicsError: "Die Turtle kennt diesen Wert nicht, zum Beispiel einen Farbnamen. Farben auf Englisch, z. B. \"red\"."
  };

  function fehlerZeigen(text, zeile) {
    text = String(text || "Unbekannter Fehler").replace(/ on line \d+\s*$/, "");
    var art = (text.match(/^(\w+)/) || [])[1];
    var m = $("meldung"); m.textContent = "";
    var kopf = document.createElement("strong");
    kopf.textContent = zeile ? "Fehler in Zeile " + zeile : "Fehler";
    var original = document.createElement("p"); original.textContent = text;
    m.append(kopf, original);
    if (HILFE[art]) { var tipp = document.createElement("p"); tipp.textContent = HILFE[art]; m.append(tipp); }
    m.hidden = false;
    ausgeben(text + "\n", "fehler");
    if (typeof zeile === "number" && zeile >= 1 && zeile <= editor.lineCount()) {
      fehlerZeile = zeile - 1;
      editor.addLineClass(fehlerZeile, "background", "tu-fehlerzeile");
      editor.scrollIntoView({ line: fehlerZeile, ch: 0 }, 60);
    }
  }

  window.addEventListener("message", function (e) {
    if (!rahmen || e.source !== rahmen.contentWindow || !e.data) return;
    var m = e.data;
    if (m.typ === "bereit") senden({ typ: "start", code: rahmen.dataset.code, faktor: faktor() });
    else if (m.typ === "aus") ausgeben(String(m.text));
    else if (m.typ === "eingabe") {
      if (m.prompt) ausgeben(String(m.prompt));
      setzeZustand("eingabe");
      $("eingabeZeile").hidden = false;
      $("eingabe").value = "";
      $("eingabe").focus();
    }
    else if (m.typ === "fertig") setzeZustand("fertig");
    else if (m.typ === "fehler") { setzeZustand("fehler"); fehlerZeigen(m.text, m.zeile); }
  });

  function eingabeSenden() {
    if (zustand !== "eingabe") return;
    var text = $("eingabe").value;
    ausgeben(text + "\n", "ein");
    $("eingabeZeile").hidden = true;
    setzeZustand("laeuft");
    senden({ typ: "eingabe", text: text });
  }
  $("knopfEingabe").addEventListener("click", eingabeSenden);
  $("eingabe").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); eingabeSenden(); } });

  /* ---------- Tempo --------------------------------------------- */

  var tempoEl = $("tempo");
  try {
    var t = Number(localStorage.getItem(SPEICHER_TEMPO));
    if (t >= 1 && t <= 7) tempoEl.value = String(t);
  } catch (e) { /* Vorgabe bleibt */ }
  function tempoText() { tempoEl.setAttribute("aria-valuetext", TEMPO_TEXT[Number(tempoEl.value) - 1]); }
  tempoText();
  tempoEl.addEventListener("input", function () {
    tempoText();
    senden({ typ: "tempo", faktor: faktor() });
    try { localStorage.setItem(SPEICHER_TEMPO, tempoEl.value); } catch (e) { /* ohne Speicher weiter */ }
  });

  /* ---------- Start --------------------------------------------- */

  laden();
  if (!db.aktuell || !db.programme[db.aktuell]) {
    var alle = sortiert();
    db.aktuell = alle.length ? alle[0].id : neuesProgramm("Mein erstes Programm", BEISPIELE.start).id;
  }
  oeffnen(db.aktuell);
  linkLesen();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* freiwillig */ }
})();
