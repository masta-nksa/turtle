/* ============================================================
   app.js – Editor, Speichern im Browser, Teilen per Link und Ablauf.
   Das Programm selbst läuft in laufzeit/skulpt.html (Sandbox-iframe).
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var SPEICHER = "turtle.programme.v1";
  var SPEICHER_TEMPO = "turtle.tempo.v1";
  var SPEICHER_KOORDINATEN = "turtle.koordinaten.v1";
  var LINK_PRAEFIX = "#programm=";
  var LINK_WARNUNG = 6000;          // ab dieser Länge kürzen manche Chat- und Mailprogramme
  var CODE_MAX = 100000;

  // Wie in Kara: sieben Stufen, «mittel» ist die Vorgabe. Faktor auf das Tempo aus speed();
  // Skulpt zeichnet bei Faktor 1 etwa dreimal langsamer als Python auf dem Computer.
  var TEMPO = [0.5, 1, 3, 6, 12, 30, Infinity];
  var TEMPO_TEXT = ["sehr langsam", "langsam", "mittel", "schnell", "sehr schnell", "blitzschnell", "Turbo"];

  var BEISPIELE = window.TurtleBeispiele;

  // ?kurs=… öffnet den Kursmodus (assets/kursmodus.js); ohne bleibt alles beim freien Programmieren.
  var such = new URLSearchParams(location.search), KURS = null, kursFehler = null;
  try {
    if (such.get("kurs") !== null) KURS = window.TurtleKurs.adresse(such.get("kurs"), location.origin + location.pathname.replace(/[^/]*$/, ""));
  } catch (e) { kursFehler = e.message; }
  if (such.get("kurs") !== null && !KURS && !kursFehler) kursFehler = "Die Kursadresse fehlt.";

  // Programm aus dem Kurs statt aus «Meine Programme»: {name, speichern(code) → true/false}
  var fremd = null;
  var hooks = {};

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
    // Hinweis «Gespeichert …» bleibt stehen, nur die Uhrzeit ändert sich: kein Springen im Layout
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(sofortSpeichern, 400);
    teilenZuruecksetzen();
  }
  function gespeichertZeigen(ok, ts) {
    $("gespeichert").textContent = ok ? "Gespeichert in diesem Browser · " + zeit(ts)
      : "Nicht gespeichert: Dieser Browser erlaubt es nicht (privates Fenster?). Bitte herunterladen.";
  }
  function sofortSpeichern() {
    clearTimeout(speicherTimer); speicherTimer = null;
    if (fremd) { gespeichertZeigen(fremd.speichern(editor.getValue()), Date.now()); return; }
    var p = aktuell(); if (!p) return;
    p.code = editor.getValue();
    p.name = $("name").value.trim() || "Ohne Namen";
    p.geaendert = Date.now();
    gespeichertZeigen(speichern(), p.geaendert);
  }
  editor.on("change", aenderung);

  // Kurzhilfe: steht der Cursor auf einem Befehl (oder in seinen Klammern), eine Zeile dazu.
  // Die Zeile hat eine feste Höhe; ohne Treffer bleibt sie leer bzw. zeigt einen Hinweis.
  var kurzhilfeEl = $("kurzhilfe"), kurzhilfeAlt;
  function kurzhilfe() {
    var c = editor.getCursor(), e = window.TurtleBefehle ? window.TurtleBefehle.beiCursor(editor.getLine(c.line) || "", c.ch) : null;
    if (e === kurzhilfeAlt) return;
    kurzhilfeAlt = e;
    kurzhilfeEl.textContent = "";
    kurzhilfeEl.classList.toggle("leer", !e);
    if (!e) { kurzhilfeEl.textContent = "Kurzhilfe: Setzen Sie den Cursor auf einen Befehl."; return; }
    var code = document.createElement("code");
    code.textContent = e.aufruf;
    kurzhilfeEl.append(code, " " + e.text);
    kurzhilfeEl.title = e.aufruf + " – " + e.text;
  }
  editor.on("cursorActivity", kurzhilfe);
  $("name").addEventListener("input", aenderung);
  window.addEventListener("pagehide", function () { if (speicherTimer) sofortSpeichern(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && speicherTimer) sofortSpeichern(); });

  function oeffnen(id) {
    if (speicherTimer) sofortSpeichern();
    zuruecksetzen();
    fremd = null;
    db.aktuell = id;
    var p = aktuell();
    ladend = true;
    editor.setValue(p.code);
    editor.clearHistory();
    $("name").value = p.name;
    ladend = false;
    teilenZuruecksetzen();
    speichern();
    gespeichertZeigen(speicherOk, p.geaendert);
  }

  // Kursmodus: Programm einer Aufgabe öffnen (wird über quelle.speichern gesichert)
  function programmLaden(code, quelle) {
    if (speicherTimer) sofortSpeichern();
    zuruecksetzen();
    fremd = quelle;
    ladend = true;
    editor.setValue(code);
    editor.clearHistory();
    ladend = false;
    teilenZuruecksetzen();
    gespeichertZeigen(true, Date.now());
  }
  function programmName() { return fremd ? fremd.name : aktuell().name; }

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
    var p = neuesProgramm("Neues Programm", BEISPIELE.neu);
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
    var n = dateiname(programmName()) + ".py";
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
    var inhalt = LZString.compressToEncodedURIComponent(JSON.stringify({ n: programmName(), c: editor.getValue() }));
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
  window.addEventListener("hashchange", function () { if (!KURS) linkLesen(); });

  /* ---------- Ablauf -------------------------------------------- */

  // zustand: "bereit" | "laeuft" | "spiel" | "pause" | "eingabe" | "fertig" | "fehler"
  // «spiel»: Das Hauptprogramm ist durch, Tasten, Klicks oder ein Timer halten es am Laufen.
  var rahmen = null, zustand = "bereit", fehlerZeile = null, spielt = false, gesperrt = false;

  var ZUSTAND_TEXT = {
    bereit: "Bereit.", laeuft: "Läuft …", pause: "Pausiert.",
    spiel: "Läuft weiter: wartet auf Tasten, Klicks oder den Timer.",
    eingabe: "Wartet auf Ihre Eingabe …", fertig: "Fertig.", fehler: "Abgebrochen wegen eines Fehlers."
  };
  function setzeZustand(z) {
    zustand = z;
    $("zustand").textContent = ZUSTAND_TEXT[z];
    var st = $("knopfStart");
    st.textContent = (z === "laeuft" || z === "eingabe" || z === "spiel") ? "Pause" : (z === "pause" ? "Weiter" : "Start");
    st.disabled = z === "eingabe" || gesperrt;
  }

  function faktor() { return TEMPO[Number($("tempo").value) - 1] || 1; }
  // Tasten gehen gleich ans Programm (Spiele): erst das iframe, dann darin das Feld fokussieren
  function fokusInsFeld() { if (rahmen) { rahmen.focus({ preventScroll: true }); senden({ typ: "fokus" }); } }
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
    ansichtZuruecksetzen();
    spielt = false;
    setzeZustand("bereit");
    if (hooks.zurueck) hooks.zurueck();
  }

  // Die Laufzeit wird einmal geladen und als srcdoc (mit eingebetteten Skripten) für jeden Start
  // wiederverwendet. So läuft «Start» auch ohne Netz weiter, sobald die Seite einmal offen war.
  // (Ein Sandbox-iframe ohne eigenen Ursprung erreicht den Service Worker nicht.)
  var laufzeitText = null;
  function laufzeitLaden() {
    if (laufzeitText) return laufzeitText;
    function holen(pfad) {
      return fetch(pfad).then(function (r) {
        if (!r.ok) throw new Error(pfad + ": " + r.status);
        return r.text();
      });
    }
    laufzeitText = Promise.all([
      holen("laufzeit/skulpt.html"), holen("vendor/skulpt.min.js"), holen("vendor/skulpt-stdlib.js")
    ]).then(function (t) {
      function einbetten(js) { return "<script>" + js.replace(/<\/script/gi, "<\\/script") + "<\/script>"; }
      var html = t[0]
        .replace('<script src="../vendor/skulpt.min.js"></script>', function () { return einbetten(t[1]); })
        .replace('<script src="../vendor/skulpt-stdlib.js"></script>', function () { return einbetten(t[2]); });
      if (html.indexOf('src="../vendor/') >= 0) throw new Error("Laufzeit: Skript-Verweise nicht gefunden");
      return html;
    });
    laufzeitText.catch(function () { laufzeitText = null; });   // beim nächsten Start neu versuchen
    return laufzeitText;
  }

  // ohne = true: den Haken vorStart übergehen (z. B. «Ohne Vorhersage starten»)
  function neuStarten(ohne) {
    if (gesperrt) return;
    if (ohne !== true && hooks.vorStart && hooks.vorStart() === false) return;
    if (speicherTimer) sofortSpeichern();
    zuruecksetzen();
    var code = editor.getValue();
    rahmen = document.createElement("iframe");
    rahmen.title = "Turtle-Feld";
    // Ohne allow-same-origin: kein Zugriff auf localStorage dieser Seite
    rahmen.setAttribute("sandbox", "allow-scripts");
    rahmen.dataset.code = code;
    $("feld").append(rahmen);
    $("leer").hidden = true;
    setzeZustand("laeuft");
    if (hooks.start) hooks.start();
    var dieser = rahmen;
    laufzeitLaden().then(function (html) {
      if (rahmen === dieser) dieser.srcdoc = html;
    }, function () {
      if (rahmen !== dieser) return;
      setzeZustand("fehler");
      var m = $("meldung"); m.textContent = "";
      var kopf = document.createElement("strong"); kopf.textContent = "Keine Verbindung";
      var p = document.createElement("p");
      p.textContent = "Python konnte nicht geladen werden. Öffnen Sie die Seite einmal mit Internet; danach funktioniert sie auch offline.";
      m.append(kopf, p); m.hidden = false;
    });
  }

  $("knopfStart").addEventListener("click", function () {
    if (zustand === "laeuft" || zustand === "spiel") { senden({ typ: "pause" }); setzeZustand("pause"); }
    else if (zustand === "pause") {
      senden({ typ: "weiter" }); setzeZustand(spielt ? "spiel" : "laeuft");
      if (spielt) fokusInsFeld();
    }
    else neuStarten();
  });
  $("knopfReset").addEventListener("click", zuruecksetzen);

  var FEHLERHILFE = window.TurtleFehlerhilfe;

  function absatz(text, klasse) {
    var p = document.createElement("p"); p.textContent = text; if (klasse) p.className = klasse; return p;
  }
  function codeBlock(text, ersteZeile) {
    var pre = document.createElement("pre"); pre.className = "tu-fehlercode";
    text.split("\n").forEach(function (z, i) {
      if (i) pre.append("\n");
      if (ersteZeile) { var nr = document.createElement("span"); nr.className = "nr"; nr.textContent = (ersteZeile + i) + " │ "; pre.append(nr); }
      pre.append(z);
    });
    return pre;
  }

  function fehlerZeigen(f) {
    var code = rahmen ? rahmen.dataset.code : editor.getValue();
    var zeilen = code.split("\n");
    var h = FEHLERHILFE.analysiere({ art: f.art, nachricht: f.nachricht, stapel: f.stapel, code: code });
    var original = String(f.text || "Unbekannter Fehler").replace(/ on line \d+\s*$/, "");

    // Ausgabe: Verlauf wie in Python, dann die Originalmeldung
    if (h.verlauf.length) {
      ausgeben("Traceback (most recent call last):\n", "fehler");
      h.verlauf.forEach(function (v) {
        ausgeben("  Zeile " + v.zeile + (v.funktion ? ", in " + v.funktion : "") + ":  " + v.text + "\n", "fehler");
      });
    }
    ausgeben(original + "\n", "fehler");

    // Meldung: Ort, Code der Zeile, Erklärung, Tipp, mehr zum Aufklappen
    var m = $("meldung"); m.textContent = "";
    var kopf = document.createElement("strong");
    kopf.textContent = h.ort ? "Fehler in " + h.ort : "Fehler";
    m.append(kopf);
    if (h.zeile && zeilen[h.zeile - 1] !== undefined && zeilen[h.zeile - 1].trim())
      m.append(codeBlock(zeilen[h.zeile - 1].replace(/\s+$/, ""), h.zeile));
    m.append(absatz(h.was));
    if (h.tipp) m.append(absatz(h.tipp));
    m.append(absatz("Python meldet: " + original, "tu-python"));
    if (h.mehr || h.beispiel) {
      var d = document.createElement("details"); d.className = "bk-hinweis";
      var su = document.createElement("summary"); su.textContent = "Mehr zu diesem Fehler";
      d.append(su);
      if (h.mehr) d.append(absatz(h.mehr));
      if (h.beispiel) {
        var bsp = document.createElement("div"); bsp.className = "tu-beispiel";
        [["So nicht:", h.beispiel.falsch], ["So geht es:", h.beispiel.richtig]].forEach(function (paar) {
          var box = document.createElement("div"), t = document.createElement("span");
          t.textContent = paar[0]; box.append(t, codeBlock(paar[1])); bsp.append(box);
        });
        d.append(bsp);
      }
      m.append(d);
    }
    m.hidden = false;

    if (typeof h.zeile === "number" && h.zeile >= 1 && h.zeile <= editor.lineCount()) {
      fehlerZeile = h.zeile - 1;
      editor.addLineClass(fehlerZeile, "background", "tu-fehlerzeile");
      editor.scrollIntoView({ line: fehlerZeile, ch: 0 }, 60);
    }
  }

  /* ---------- Koordinatensystem und Ausschnitt ------------------ */

  var FELD = 500;
  var ansichtGroesse = FELD, turtlePos = null, koordinatenAn = false, vorlageSvg = "";
  var SVG = "http://www.w3.org/2000/svg";

  function zahl(x) { var r = Math.round(x); return (r < 0 ? "−" : "") + Math.abs(r); }

  // Unter der Zeichnung: immer Kacheln zu 50 Einheiten (beim Herauszoomen werden sie enger) und
  // beim Herauszoomen der Rand des ursprünglichen Feldes. Mit dem Schalter: Achsen, Gitter, Zahlen.
  var KACHEL = 50;
  function rasterZeichnen() {
    var svg = $("raster");
    $("feld").classList.toggle("mit-raster", koordinatenAn);
    var v = ansichtGroesse, h = v / 2, teile = [], k;
    function linie(x1, y1, x2, y2, klasse) { teile.push('<line class="' + klasse + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'); }
    for (k = Math.ceil(-h / KACHEL) * KACHEL; k <= h; k += KACHEL) {
      linie(k, -h, k, h, "kachel");
      linie(-h, -k, h, -k, "kachel");
    }
    if (v > FELD + 1) teile.push('<rect class="feldrand" x="' + -FELD / 2 + '" y="' + -FELD / 2 + '" width="' + FELD + '" height="' + FELD + '"/>');
    if (koordinatenAn) {
      var schritt = [50, 100, 200, 250, 500].filter(function (s) { return v / s <= 10; })[0] || 500;
      var fs = v / 36;
      var text = function (x, y, t, anker) {
        teile.push('<text x="' + x + '" y="' + y + '" font-size="' + fs + '" stroke-width="' + fs / 4 + '" text-anchor="' + anker + '">' + t + "</text>");
      };
      for (k = Math.ceil(-h / schritt) * schritt; k <= h; k += schritt) {
        if (k === 0) continue;
        linie(k, -h, k, h, "gitter");
        linie(-h, -k, h, -k, "gitter");
      }
      linie(-h, 0, h, 0, "achse");
      linie(0, -h, 0, h, "achse");
      for (k = Math.ceil(-h / schritt) * schritt; k <= h; k += schritt) {
        if (k === 0 || Math.abs(k) > h - fs) continue;
        text(k, fs * 1.2, zahl(k), "middle");
        text(fs * 0.4, -k + fs * 0.35, zahl(k), "start");
      }
      text(fs * 0.4, fs * 1.2, "0", "start");
      text(h - fs * 0.5, -fs * 0.5, "x", "end");
      text(fs * 0.6, -h + fs * 1.2, "y", "start");
    }
    // Zielbild als blasse Vorlage (Weltkoordinaten, y nach oben)
    if (vorlageSvg) teile.push('<g class="vorlage" transform="scale(1,-1)">' + vorlageSvg + "</g>");
    svg.setAttribute("viewBox", -h + " " + -h + " " + v + " " + v);
    svg.innerHTML = teile.join("");
  }

  // Koordinaten beim Zeiger: fx, fy sind Anteile der Feldbreite (0 … 1), umgerechnet mit der
  // aktuellen Ansicht. So stimmen sie auch beim Herauszoomen.
  var mausEl = $("maus"), mausTimer = null;
  function mausZeigen(fx, fy, beruehrung) {
    if (!(fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1)) { mausWeg(); return; }
    var x = (fx - 0.5) * ansichtGroesse, y = (0.5 - fy) * ansichtGroesse;
    mausEl.textContent = "(" + zahl(x) + ", " + zahl(y) + ")";
    mausEl.hidden = false;
    var b = $("feld").clientWidth, h = $("feld").clientHeight, px = fx * b, py = fy * h;
    var w = mausEl.offsetWidth, hh = mausEl.offsetHeight, abstand = beruehrung ? 28 : 14;
    // rechts unterhalb des Zeigers; am Rand auf die andere Seite (beim Finger darüber)
    var links = px + abstand + w > b ? px - abstand - w : px + abstand;
    var oben = beruehrung || py + abstand + hh > h ? py - abstand - hh : py + abstand;
    mausEl.style.transform = "translate(" + Math.max(2, links) + "px," + Math.max(2, oben) + "px)";
    clearTimeout(mausTimer);
    if (beruehrung) mausTimer = setTimeout(mausWeg, 1500);
  }
  function mausWeg() { mausEl.hidden = true; }
  function feldZeiger(e) {
    var r = $("feld").getBoundingClientRect();
    mausZeigen((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pointerType === "touch");
  }
  // ohne laufendes Programm (oder neben dem iframe) kommen die Ereignisse direkt hier an
  $("feld").addEventListener("pointermove", feldZeiger);
  $("feld").addEventListener("pointerdown", feldZeiger);
  $("feld").addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") mausWeg(); });
  // Verlässt der Zeiger das iframe, meldet das nicht jeder Browser: Bewegung ausserhalb des Feldes blendet aus
  document.addEventListener("pointermove", function (e) {
    if (!mausEl.hidden && e.pointerType !== "touch" && !$("feld").contains(e.target)) mausWeg();
  });

  // Eine Zeile mit fester Höhe: links die Position, rechts der Zoom (nichts verschiebt sich)
  function feldInfoZeigen() {
    $("feldPos").textContent = koordinatenAn && turtlePos
      ? "Turtle bei x = " + zahl(turtlePos.x) + ", y = " + zahl(turtlePos.y) : "";
    var zoom = $("feldZoom");
    if (turtlePos && turtlePos.ausserhalb) zoom.textContent = "Turtle ausserhalb des Feldes";
    else if (ansichtGroesse > FELD + 1) zoom.textContent = "Herausgezoomt: " + Math.round(FELD / ansichtGroesse * 100) + " %";
    else zoom.textContent = "";
    zoom.title = zoom.textContent ? "Die Turtle hat das Feld (−250 … 250) verlassen; die Ansicht zeigt mehr." : "";
  }

  function ansichtZuruecksetzen() {
    ansichtGroesse = FELD; turtlePos = null;
    rasterZeichnen(); feldInfoZeigen();
  }

  var koordinatenEl = $("koordinaten");
  try { koordinatenAn = localStorage.getItem(SPEICHER_KOORDINATEN) === "1"; } catch (e) { /* aus */ }
  koordinatenEl.checked = koordinatenAn;
  koordinatenEl.addEventListener("change", function () {
    koordinatenAn = koordinatenEl.checked;
    try { localStorage.setItem(SPEICHER_KOORDINATEN, koordinatenAn ? "1" : "0"); } catch (e) { /* ohne Speicher weiter */ }
    rasterZeichnen(); feldInfoZeigen();
  });

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
    else if (m.typ === "fertig") {
      spielt = !!m.wartet;
      if (zustand !== "pause") setzeZustand(spielt ? "spiel" : "fertig");
      if (spielt) fokusInsFeld();
      var z = m.zeichnung && typeof m.zeichnung === "object" ? m.zeichnung : null;
      if (z) zielWerkzeugZeigen(z);
      if (hooks.fertig) hooks.fertig(z, spielt, rahmen.dataset.code);
    }
    else if (m.typ === "fehler") { spielt = false; setzeZustand("fehler"); fehlerZeigen(m); if (hooks.fehler) hooks.fehler(); }
    else if (m.typ === "ansicht" && m.groesse > 0) { ansichtGroesse = Number(m.groesse); rasterZeichnen(); feldInfoZeigen(); }
    else if (m.typ === "maus") { if (m.weg) mausWeg(); else mausZeigen(Number(m.fx), Number(m.fy), !!m.touch); }
    else if (m.typ === "position") {
      turtlePos = { x: Number(m.x) || 0, y: Number(m.y) || 0, ausserhalb: !!m.ausserhalb };
      feldInfoZeigen();
    }
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

  /* ---------- Zielbild-Werkzeug (?werkzeug=ziel) ---------------- */

  // Für Lehrpersonen: Die Zeichnung des letzten Laufs als «ziel» für kurs.json.
  var werkzeugZiel = such.get("werkzeug") === "ziel", letzteZeichnung = null;
  $("zielWerkzeug").hidden = !werkzeugZiel;
  function zielWerkzeugZeigen(z) {
    if (!werkzeugZiel) return;
    letzteZeichnung = z;
    var ziel = window.TurtlePruefung.zielAusZeichnung(z, $("zielFarbe").checked, farbeText);
    $("zielText").value = JSON.stringify(ziel).replace(/\{"art"/g, '\n  {"art"').replace(/\]\}$/, "\n]}");
  }
  $("zielFarbe").addEventListener("change", function () { if (letzteZeichnung) zielWerkzeugZeigen(letzteZeichnung); });
  $("zielKopieren").addEventListener("click", function () {
    var t = $("zielText"); t.focus(); t.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).catch(function () { /* markiert */ });
  });

  // Farbangaben vereinheitlichen (Name, #rgb, rgb(…)) über den Browser: «#rrggbb», Deckkraft weg
  var farbKontext = document.createElement("canvas").getContext("2d");
  function farbeText(f) {
    farbKontext.fillStyle = "#000000";
    farbKontext.fillStyle = String(f);
    var w = farbKontext.fillStyle, m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(w);
    if (!m) return w;
    return "#" + [m[1], m[2], m[3]].map(function (x) { return ("0" + Number(x).toString(16)).slice(-2); }).join("");
  }

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

  /* ---------- Vollbild ------------------------------------------ */

  // «programm»: Editor gross, Feld und Ausgabe schmal daneben; «feld»: Turtle-Feld so gross wie möglich.
  // Wo der Browser es erlaubt, zusätzlich echtes Vollbild (ohne Browserleiste); sonst nur die Ansicht.
  var vollbildModus = null;
  function istVollbild() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function vollbildSetzen(modus) {
    vollbildModus = modus;
    if (modus) document.body.dataset.vollbild = modus; else delete document.body.dataset.vollbild;
    document.querySelectorAll(".tu-vollbild").forEach(function (k) {
      var an = k.dataset.vollbild === modus;
      k.setAttribute("aria-pressed", an ? "true" : "false");
      k.querySelector("span").textContent = an ? "Verkleinern" : "Vollbild";
      k.title = an ? "Vollbild beenden (Esc)"
        : k.dataset.vollbild === "feld" ? "Turtle-Feld im Vollbild" : "Programm im Vollbild, Turtle-Feld klein daneben";
    });
    var el = document.documentElement;
    if (modus && !istVollbild()) {
      var an = el.requestFullscreen || el.webkitRequestFullscreen;
      if (an) { try { var r = an.call(el); if (r && r.catch) r.catch(function () { /* nur Ansicht */ }); } catch (e) { /* nur Ansicht */ } }
    } else if (!modus && istVollbild()) {
      var aus = document.exitFullscreen || document.webkitExitFullscreen;
      if (aus) { try { var q = aus.call(document); if (q && q.catch) q.catch(function () {}); } catch (e) { /* schon zu */ } }
    }
    setTimeout(function () { editor.refresh(); }, 60);
  }
  document.querySelectorAll(".tu-vollbild").forEach(function (k) {
    k.addEventListener("click", function () { vollbildSetzen(vollbildModus === k.dataset.vollbild ? null : k.dataset.vollbild); });
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (typ) {
    document.addEventListener(typ, function () {
      if (!istVollbild() && vollbildModus) vollbildSetzen(null);   // Esc oder Browser hat beendet
      else setTimeout(function () { editor.refresh(); }, 60);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && vollbildModus && !istVollbild() && !document.querySelector("dialog[open]")) vollbildSetzen(null);
  });

  /* ---------- Start --------------------------------------------- */

  // Freies Programmieren: zuletzt offenes Programm aus «Meine Programme»
  function freiStarten() {
    laden();
    if (!db.aktuell || !db.programme[db.aktuell]) {
      var alle = sortiert();
      db.aktuell = alle.length ? alle[0].id : neuesProgramm("Mein erstes Programm", BEISPIELE.start).id;
    }
    oeffnen(db.aktuell);
    linkLesen();
  }

  window.TurtleApp = {
    kurs: KURS, kursFehler: kursFehler, editor: editor, hooks: hooks,
    programmLaden: programmLaden, freiStarten: freiStarten, zuruecksetzen: zuruecksetzen,
    sofortSpeichern: function () { if (speicherTimer) sofortSpeichern(); },
    starten: function () { neuStarten(true); },
    // Kursmodus: gesperrte Aufgabe (Programm nur lesen, kein Start)
    sperren: function (an) {
      gesperrt = !!an;
      editor.setOption("readOnly", gesperrt);
      $("knopfStartcode").disabled = gesperrt;
      setzeZustand(zustand);
    },
    vorlage: function (svg) { vorlageSvg = svg || ""; rasterZeichnen(); },
    farbeText: farbeText
  };
  if (!KURS) freiStarten();
  kurzhilfe();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* freiwillig */ }
  laufzeitLaden();   // schon jetzt, damit «Start» auch nach Verbindungsverlust geht

  // Offline: Der Service Worker legt alle Dateien im Browser ab (nur über https oder localhost).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* dann eben nur online */ });
  }
})();
