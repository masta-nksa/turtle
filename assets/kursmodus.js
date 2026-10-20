/* ============================================================
   kursmodus.js – Kurs mit Reihen und Aufgaben (?kurs=…), Bedienung wie in Kara.
   Kursdaten (kurs.js) erscheinen nur als Text. Jede Aufgabe hat ihr eigenes Programm;
   Fortschritt und Programme bleiben im Browser (turtle.kurs.<kurs>.v1).
   Erledigt ist eine Aufgabe, wenn die Zeichnung zum Zielbild passt (pruefung.js) oder
   wenn sie selbst abgehakt ist; beides wird getrennt gespeichert und angezeigt.
   ============================================================ */
(function () {
  "use strict";

  var A = window.TurtleApp, K = window.TurtleKurs, P = window.TurtlePruefung;
  if (!A || (!A.kurs && !A.kursFehler)) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  var KURS_CACHE = "turtle-kurse";
  var LEER = "from turtle import *\n\n";

  function fehlerZeigen(text) {
    $("kurs").hidden = false;
    $("reihen").hidden = true;
    var f = $("kursFehler");
    f.textContent = text + " Sie können ohne Kurs weiter programmieren.";
    f.hidden = false;
  }
  if (A.kursFehler) { fehlerZeigen(A.kursFehler); return; }

  var adr = A.kurs, SPEICHER = "turtle.kurs." + adr.kennung + ".v1";
  var kurs = null, alle = {}, reihe = null, aufg = null, tippStufe = 1, vorlageAn = false;
  document.body.classList.add("im-kurs");

  /* ---------- Speicher ---------------------------------------- */

  var st = { programme: {}, erledigt: {}, offen: null };
  try {
    var d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
    if (d && typeof d === "object") {
      if (d.programme && typeof d.programme === "object") st.programme = d.programme;
      if (d.erledigt && typeof d.erledigt === "object") st.erledigt = d.erledigt;
      if (d.offen && typeof d.offen === "object") st.offen = d.offen;
    }
  } catch (e) { /* ohne gespeicherten Stand */ }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(st)); return true; } catch (e) { return false; }
  }
  function erledigt(a) { return st.erledigt[a.id] || {}; }

  /* ---------- Text aus dem Kurs (nur textContent) -------------- */

  function zeileFuellen(ziel, teile) {
    teile.forEach(function (t) { ziel.append(t.code !== undefined ? el("code", null, t.code) : t.text); });
  }
  function textZeigen(box, text) {
    box.textContent = "";
    K.bloecke(text).forEach(function (b) {
      if (b.art === "code") { var pre = el("pre", "tu-kurscode"); pre.textContent = b.text; box.append(pre); }
      else if (b.art === "titel") box.append(el("h4", null, b.text));
      else if (b.art === "liste") {
        var ul = el("ul");
        b.eintraege.forEach(function (z) { var li = el("li"); zeileFuellen(li, z); ul.append(li); });
        box.append(ul);
      } else {
        var p = el("p");
        b.zeilen.forEach(function (z, i) { if (i) p.append(el("br")); zeileFuellen(p, z); });
        box.append(p);
      }
    });
  }
  function listeZeigen(box, eintraege) {
    box.textContent = "";
    (eintraege || []).forEach(function (t) { var li = el("li"); zeileFuellen(li, flach(t)); box.append(li); });
    box.hidden = !(eintraege && eintraege.length);
  }
  function flach(t) {   // ein Eintrag: Zeilen hintereinander, `…` als Code
    var teile = [];
    K.bloecke(t).forEach(function (b) {
      if (b.art === "absatz") b.zeilen.forEach(function (z) { teile = teile.concat(z, [{ text: " " }]); });
      else if (b.art === "liste") b.eintraege.forEach(function (z) { teile = teile.concat(z, [{ text: " " }]); });
      else if (b.art === "titel") teile.push({ text: b.text + " " });
      else teile.push({ code: b.text });
    });
    if (teile.length && teile[teile.length - 1].text === " ") teile.pop();
    return teile;
  }

  /* ---------- Laden ------------------------------------------- */

  function holeKurs(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 404 ? "Die Datei kurs.json wurde nicht gefunden." : "HTTP " + r.status);
      if (window.caches) { var kopie = r.clone(); caches.open(KURS_CACHE).then(function (c) { c.put(url, kopie); }).catch(function () {}); }
      return r.json();
    }, function () {
      // ohne Netz: zuletzt geladene Fassung
      if (!window.caches) throw new Error("Keine Verbindung.");
      return caches.match(url).then(function (r) {
        if (!r) throw new Error("Keine Verbindung, und der Kurs wurde auf diesem Gerät noch nie geladen.");
        return r.json();
      });
    });
  }

  holeKurs(adr.datei).then(function (daten) {
    var erg = K.pruefe(daten);
    erg.warnungen.forEach(function (w) { console.warn("[kurs]", w); });
    kurs = erg.kurs;
    alle = erg.aufgaben;
    aufbauen();
  }).catch(function (e) {
    document.body.classList.remove("im-kurs");
    fehlerZeigen("Der Kurs «" + adr.wert + "» kann nicht geladen werden: " + (e && e.message ? e.message : e));
    console.error("[kurs]", e);
    A.freiStarten();
  });

  function aufbauen() {
    $("kurs").hidden = false;
    $("kursLeiste").hidden = false;
    $("aufgabe").hidden = false;
    $("linkFrei").href = location.pathname;
    document.querySelector(".bk-kopf-seite .eyebrow").textContent = "Turtle · Kurs";
    document.querySelector(".bk-kopf-seite h1").textContent = kurs.titel;
    $("lead").textContent = kurs.untertitel ||
      "Lösen Sie die Aufgaben mit Python und der Turtle. Ihre Programme und Ihr Fortschritt bleiben nur in diesem Browser.";
    document.title = kurs.titel + " · Turtle";
    $("knopfKonzepte").hidden = !kurs.konzepte.length;
    $("knopfTeilen").textContent = "Programm als Link kopieren";   // «Link zum Teilen kopieren» gilt der Aufgabe
    baueReihen();
    bilderAblegen();

    var such = new URLSearchParams(location.search), wahl = alle[such.get("aufgabe")];
    if (!wahl && st.offen) wahl = alle[st.offen.aufgabe];
    var r = kurs.reihen.filter(function (x) { return wahl ? x.id === wahl.reihe : x.id === such.get("reihe"); })[0] || kurs.reihen[0];
    zeigeReihe(r, wahl && wahl.reihe === r.id ? wahl : null);
  }

  // Bilder für den Offline-Betrieb ablegen (gleich wie kurs.json)
  function bilderAblegen() {
    if (!window.caches) return;
    var urls = [];
    kurs.reihen.forEach(function (r) { r.aufgaben.forEach(function (a) { if (a.bild) urls.push(new URL(a.bild, adr.basis).href); }); });
    if (urls.length) caches.open(KURS_CACHE).then(function (c) {
      urls.forEach(function (u) { c.add(u).catch(function () { /* fehlt eben offline */ }); });
    }).catch(function () {});
  }

  /* ---------- Reihen und Aufgaben-Reiter ----------------------- */

  function pflicht(r) { return r.aufgaben.filter(function (a) { return !a.zusatz; }); }
  function fertig(a) { var e = erledigt(a); return !!(e.g || e.s); }

  function baueReihen() {
    var box = $("reihen"), trenner = false;
    box.textContent = "";
    kurs.reihen.forEach(function (r) {
      if (r.weiterfuehrend && !trenner) { box.append(el("span", "tu-reihen-trenner", "Weiterführend:")); trenner = true; }
      var b = el("button", "bk-reihe" + (r.weiterfuehrend ? " tu-weiterfuehrend" : ""));
      b.type = "button";
      b.dataset.id = r.id;
      if (r.untertitel) b.title = r.untertitel;
      b.append(el("span", null, r.titel), el("span", "tu-stand"));
      b.addEventListener("click", function () { if (r !== reihe) zeigeReihe(r); });
      box.append(b);
    });
  }
  function reihenAktualisieren() {
    Array.prototype.forEach.call($("reihen").querySelectorAll(".bk-reihe"), function (b) {
      var r = kurs.reihen.filter(function (x) { return x.id === b.dataset.id; })[0], p = pflicht(r);
      var n = p.filter(fertig).length;
      b.setAttribute("aria-pressed", r === reihe ? "true" : "false");
      b.querySelector(".tu-stand").textContent = p.length ? n + "/" + p.length : "";
      b.setAttribute("aria-label", r.titel + (p.length ? ", " + n + " von " + p.length + " erledigt" : ""));
    });
  }

  function zeigeReihe(r, a) {
    reihe = r;
    var ol = $("aufgabenListe"), abschnitt = null;
    ol.textContent = "";
    r.aufgaben.forEach(function (x) {
      if (x.abschnitt && x.abschnitt !== abschnitt) {
        ol.append(el("li", "tu-abschnitt", x.abschnitt));
      }
      abschnitt = x.abschnitt || abschnitt;
      var li = el("li"), b = el("button", "bk-tab");
      b.type = "button";
      b.dataset.id = x.id;
      b.append(el("span", null, (x.zusatz ? "★ " : "") + x.titel), el("span", "haken"));
      b.addEventListener("click", function () { waehleAufgabe(x); });
      li.append(b);
      ol.append(li);
    });
    reihenAktualisieren();
    waehleAufgabe(a || r.aufgaben[0]);
  }

  function tabsAktualisieren() {
    Array.prototype.forEach.call($("aufgabenListe").querySelectorAll(".bk-tab"), function (b) {
      var x = alle[b.dataset.id], e = erledigt(x), h = b.querySelector(".haken");
      b.setAttribute("aria-current", x === aufg ? "true" : "false");
      h.textContent = e.g || e.s ? "✓" : "";
      h.classList.toggle("selbst", !e.g && !!e.s);
      b.title = e.g ? "Automatisch geprüft" : e.s ? "Selbst abgehakt" : "";
      b.setAttribute("aria-label", x.titel + (x.zusatz ? ", Zusatzaufgabe" : "") +
        (e.g ? ", automatisch geprüft" : e.s ? ", selbst abgehakt" : ""));
    });
    reihenAktualisieren();
  }

  /* ---------- Eine Aufgabe ------------------------------------ */

  function startcode(a) {
    if (a.weiterVon && st.programme[a.weiterVon] && st.programme[a.weiterVon].trim()) return st.programme[a.weiterVon];
    if (a.startcode !== undefined) return a.startcode;
    if (a.weiterVon) return startcode(alle[a.weiterVon]);
    return LEER;
  }

  function quelle(a) {
    return {
      name: a.titel,
      speichern: function (code) { st.programme[a.id] = code; return speichern(); }
    };
  }

  function adresseSetzen() {
    try {
      var u = location.pathname + "?kurs=" + adr.wert + "&reihe=" + reihe.id + "&aufgabe=" + aufg.id +
        (new URLSearchParams(location.search).get("werkzeug") === "ziel" ? "&werkzeug=ziel" : "");
      history.replaceState(null, "", u);
    } catch (e) { /* Adresszeile bleibt */ }
  }

  function waehleAufgabe(a) {
    A.sofortSpeichern();
    aufg = a;
    st.offen = { reihe: reihe.id, aufgabe: a.id };
    speichern();

    $("aufgabeTitel").textContent = a.titel;
    etikettenZeigen(a);
    $("vorhersage").hidden = !a.vorhersage;
    textZeigen($("aufgabeText"), a.text);
    listeZeigen($("fragen"), a.fragen);
    listeZeigen($("checkliste"), a.checkliste);
    var bild = $("aufgabeBild");
    if (a.bild) {
      bild.hidden = false;
      bild.alt = "Bild zur Aufgabe «" + a.titel + "»";
      bild.onerror = function () { bild.hidden = true; };
      bild.src = new URL(a.bild, adr.basis).href;
    } else { bild.hidden = true; bild.removeAttribute("src"); }
    var von = a.weiterVon && alle[a.weiterVon];
    $("weiterHinweis").hidden = !von;
    if (von) $("weiterHinweis").textContent = "Baut auf «" + von.titel + "» auf: Beim ersten Öffnen steht hier Ihr Programm von dort.";
    tippStufe = 1;
    $("hinweisBox").open = false;
    hinweiseZeigen();
    $("aufgabeLink").hidden = true;
    $("aufgabeMeldung").hidden = true;

    var code = typeof st.programme[a.id] === "string" ? st.programme[a.id] : startcode(a);
    A.programmLaden(code, quelle(a));
    var k = $("knopfStartcode");
    k.hidden = false;
    k.textContent = a.startcode === undefined && von ? "Programm aus «" + von.titel + "» übernehmen" : "Zurück zum Startcode";

    $("vorlageSchalter").hidden = !a.ziel;
    vorlageSetzen();
    $("pruefung").hidden = true;
    statusZeigen();
    tabsAktualisieren();
    adresseSetzen();
  }

  function etikettenZeigen(a) {
    var box = $("etiketten");
    box.textContent = "";
    if (a.zusatz) box.append(el("span", "tu-etikett zusatz", "★ Zusatzaufgabe"));
    if (a.kontrolle) box.append(el("span", "tu-etikett kontrolle", "Lernkontrolle"));
    (a.konzepte || []).forEach(function (id) {
      var k = kurs.konzepte.filter(function (x) { return x.id === id; })[0];
      var b = el("button", "tu-etikett konzept", k.titel);
      b.type = "button";
      b.title = "Konzept «" + k.titel + "» nachlesen";
      b.addEventListener("click", function () { konzepteOeffnen(id); });
      box.append(b);
    });
    box.hidden = !box.childNodes.length;
  }

  // Hinweise gestuft wie in Kara: jeder weitere erst auf Klick; bei Lernkontrollen keine
  function hinweiseZeigen() {
    var liste = aufg.kontrolle ? [] : (aufg.hinweise || []), box = $("hinweisListe");
    $("hinweisBox").hidden = !liste.length;
    box.textContent = "";
    liste.slice(0, tippStufe).forEach(function (t) { var d = el("div", "tu-text tu-tipptext"); textZeigen(d, t); box.append(d); });
    var knopf = $("knopfTipp");
    knopf.hidden = tippStufe >= liste.length;
    knopf.textContent = "Noch ein Tipp (" + (tippStufe + 1) + " von " + liste.length + ")";
  }
  $("knopfTipp").addEventListener("click", function () { tippStufe++; hinweiseZeigen(); });

  $("knopfStartcode").addEventListener("click", function () {
    if (!aufg) return;
    var von = aufg.weiterVon && alle[aufg.weiterVon];
    var frage = aufg.startcode === undefined && von
      ? "Ihr Programm für diese Aufgabe durch Ihr Programm aus «" + von.titel + "» ersetzen?"
      : "Ihr Programm für diese Aufgabe durch den Startcode ersetzen? Das lässt sich nicht rückgängig machen.";
    if (!confirm(frage)) return;
    var code = aufg.startcode === undefined && von ? startcode(aufg) : (aufg.startcode !== undefined ? aufg.startcode : LEER);
    st.programme[aufg.id] = code;
    speichern();
    A.programmLaden(code, quelle(aufg));
  });

  /* ---------- Erledigt: selbst oder geprüft --------------------- */

  function statusZeigen() {
    var e = erledigt(aufg), s = $("aufgabeStatus");
    $("selbst").checked = !!e.s;
    s.className = "tu-status" + (e.g ? " ok" : e.s ? " selbst" : "");
    s.textContent = e.g ? "✓ Automatisch geprüft: Die Zeichnung passt zum Zielbild."
      : e.s ? "✓ Selbst als erledigt markiert."
        : aufg.ziel ? "Noch offen. Nach «Start» wird die Zeichnung mit dem Zielbild verglichen." : "Noch offen.";
  }
  $("selbst").addEventListener("change", function () {
    var e = st.erledigt[aufg.id] || {};
    if (this.checked) e.s = 1; else delete e.s;
    if (e.g || e.s) st.erledigt[aufg.id] = e; else delete st.erledigt[aufg.id];
    speichern();
    statusZeigen();
    tabsAktualisieren();
  });

  /* ---------- Automatische Prüfung ----------------------------- */

  var farbCache = {};
  function farbeGleich(a, b) {
    function n(f) { return farbCache[f] || (farbCache[f] = A.farbeText(f)); }
    return n(a) === n(b);
  }
  function prozent(x) { return Math.floor(x * 100) + " %"; }

  function naechste() {
    var i = reihe.aufgaben.indexOf(aufg);
    if (i < reihe.aufgaben.length - 1) return { reihe: reihe, aufgabe: reihe.aufgaben[i + 1] };
    var j = kurs.reihen.indexOf(reihe);
    if (j < kurs.reihen.length - 1 && !kurs.reihen[j + 1].weiterfuehrend) return { reihe: kurs.reihen[j + 1], aufgabe: kurs.reihen[j + 1].aufgaben[0] };
    return null;
  }

  function pruefungZeigen(art, kopf, saetze, knopf) {
    var m = $("pruefung");
    m.className = "bk-meldung" + (art ? " " + art : "");
    m.textContent = "";
    m.append(el("strong", null, kopf));
    saetze.forEach(function (t) { m.append(el("p", null, t)); });
    if (knopf) m.append(knopf);
    m.hidden = false;
  }

  A.hooks.start = A.hooks.zurueck = function () { $("pruefung").hidden = true; };
  A.hooks.fertig = function (zeichnung, wartet) {
    if (!aufg || !aufg.ziel || !zeichnung) return;
    if (zeichnung.voll) { pruefungZeigen("", "Nicht geprüft", ["Das Programm hat sehr viel gezeichnet; so viel kann nicht verglichen werden."]); return; }
    var r = P.vergleiche(aufg.ziel, zeichnung, farbeGleich);
    if (r.ok) {
      var e = st.erledigt[aufg.id] || {};
      e.g = 1;
      st.erledigt[aufg.id] = e;
      speichern();
      statusZeigen();
      tabsAktualisieren();
      var n = naechste(), knopf = null;
      if (n) {
        knopf = el("button", "bk-knopf primaer", n.reihe === reihe ? "Nächste Aufgabe" : "Weiter zu «" + n.reihe.titel + "»");
        knopf.type = "button";
        knopf.addEventListener("click", function () {
          if (n.reihe === reihe) waehleAufgabe(n.aufgabe); else zeigeReihe(n.reihe, n.aufgabe);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      pruefungZeigen("ok", "Geschafft", ["Die Zeichnung passt zum Zielbild." + (n ? "" : " Das war die letzte Aufgabe dieser Reihe.")], knopf);
      return;
    }
    var s = [];
    if (r.leer) s.push("Es wurde nichts gezeichnet. Ist der Stift unten (pendown)?");
    else {
      if (r.farbeFalsch) s.push("Die Linien liegen richtig, aber die Farbe stimmt noch nicht.");
      else if (r.abdeckung < (aufg.ziel.schwelle || P.VORGABE.schwelle)) s.push("Vom Zielbild fehlt noch etwas: " + prozent(r.abdeckung) + " sind gezeichnet.");
      if (r.genauigkeit < (aufg.ziel.schwelle || P.VORGABE.schwelle)) s.push("Einige Linien liegen neben dem Zielbild: " + prozent(r.genauigkeit) + " Ihrer Linien passen.");
      if (r.punkteFehlen) s.push(r.punkteFehlen === 1 ? "Ein Punkt (dot) fehlt noch oder hat die falsche Grösse oder Farbe." : r.punkteFehlen + " Punkte (dot) fehlen noch oder haben die falsche Grösse oder Farbe.");
      if (r.punkteZuviel) s.push(r.punkteZuviel === 1 ? "Ein Punkt (dot) ist zu viel." : r.punkteZuviel + " Punkte (dot) sind zu viel.");
      if (r.flaechen !== null && r.flaechen < P.VORGABE.flaecheSchwelle) s.push("Die gefüllte Fläche stimmt noch nicht (begin_fill / end_fill, Füllfarbe).");
    }
    if (!vorlageAn) s.push("Tipp: Blenden Sie das Zielbild als Vorlage ein.");
    pruefungZeigen("", "Noch nicht ganz", s);
  };

  /* ---------- Vorlage im Feld ---------------------------------- */

  function vorlageSvg(ziel) {
    var z = P.zerlegen(ziel), tol = ziel.toleranz || P.VORGABE.toleranz, gruppen = {}, teile = [];
    function f(x) { return Math.round(x * 10) / 10; }
    z.strecken.forEach(function (s) {
      var k = s[4] || "";
      (gruppen[k] || (gruppen[k] = [])).push("M" + f(s[0]) + " " + f(s[1]) + "L" + f(s[2]) + " " + f(s[3]));
    });
    z.flaechen.forEach(function (fl) {
      teile.push('<polygon class="fl" points="' + fl.punkte.map(function (q) { return f(q[0]) + "," + f(q[1]); }).join(" ") +
        '" fill="' + (fl.farbe || "#0f6b63") + '"/>');
    });
    Object.keys(gruppen).forEach(function (k) {
      teile.push('<path d="' + gruppen[k].join("") + '" stroke="' + (k || "#0f6b63") + '" stroke-width="' + f(tol * 1.4) + '"/>');
    });
    z.punkte.forEach(function (q) {
      teile.push('<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + f(Math.max(3, (q[2] || 6) / 2)) + '" fill="' + (q[3] || "#0f6b63") + '"/>');
    });
    return teile.join("");
  }
  function vorlageSetzen() {
    A.vorlage(aufg && aufg.ziel && vorlageAn ? vorlageSvg(aufg.ziel) : "");
    $("vorlage").checked = vorlageAn;
  }
  $("vorlage").addEventListener("change", function () { vorlageAn = this.checked; vorlageSetzen(); });

  /* ---------- Link zur Aufgabe --------------------------------- */

  $("aufgabeTeilen").addEventListener("click", function () {
    var url = location.origin + location.pathname + "?kurs=" + adr.wert + "&reihe=" + reihe.id + "&aufgabe=" + aufg.id;
    var feld = $("aufgabeLink"), m = $("aufgabeMeldung");
    feld.value = url;
    feld.hidden = false;
    feld.focus();
    feld.select();
    function fertigMeldung(ok) {
      m.textContent = ok ? "Link kopiert. Er öffnet genau diese Aufgabe." : "Bitte den markierten Link selbst kopieren.";
      m.hidden = false;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { fertigMeldung(true); }, function () { fertigMeldung(false); });
    else fertigMeldung(false);
  });

  /* ---------- Konzepte ----------------------------------------- */

  function konzepteOeffnen(id) {
    var wahl = $("konzeptWahl");
    if (!wahl.childNodes.length) {
      kurs.konzepte.forEach(function (k) {
        var b = el("button", "bk-reihe", k.titel);
        b.type = "button";
        b.dataset.id = k.id;
        b.addEventListener("click", function () { konzeptZeigen(k.id); });
        wahl.append(b);
      });
    }
    konzeptZeigen(id || kurs.konzepte[0].id);
    var d = $("konzepteDialog");
    if (!d.open) d.showModal();
  }
  function konzeptZeigen(id) {
    var k = kurs.konzepte.filter(function (x) { return x.id === id; })[0];
    Array.prototype.forEach.call($("konzeptWahl").children, function (b) { b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false"); });
    var box = $("konzeptText");
    textZeigen(box, k.text);
    box.prepend(el("h3", null, k.titel));
    box.scrollTop = 0;
  }
  $("knopfKonzepte").addEventListener("click", function () { konzepteOeffnen(); });
  $("konzepteZu").addEventListener("click", function () { $("konzepteDialog").close(); });
})();
