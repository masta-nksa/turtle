/* ============================================================
   kursmodus.js – Kurs mit Reihen (Einheiten) und Aufgaben (?kurs=…).
   Lernpfad: Einheiten als Kreise mit Fortschritt, Aufgaben als Stationen einer Linie,
   die ganze Liste im Fenster «Übersicht». Kursdaten (kurs.js) erscheinen nur als Text.
   Jede Aufgabe hat ihr eigenes Programm; Fortschritt, Programme und Vorhersagen bleiben im
   Browser (turtle.kurs.<kurs>.v1). Erledigt ist eine Aufgabe, wenn die Zeichnung zum Zielbild
   passt (pruefung.js) oder wenn sie selbst abgehakt ist; beides wird getrennt gespeichert.
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
    $("pfad").hidden = true;
    var f = $("kursFehler");
    f.textContent = text + " Sie können ohne Kurs weiter programmieren.";
    f.hidden = false;
  }
  if (A.kursFehler) { fehlerZeigen(A.kursFehler); return; }

  var adr = A.kurs, SPEICHER = "turtle.kurs." + adr.kennung + ".v1";
  var kurs = null, alle = {}, reihe = null, aufg = null, tippStufe = 1, vorlageAn = false;
  document.body.classList.add("im-kurs");

  /* ---------- Speicher ---------------------------------------- */

  // vorhersagen: {id: {t: Text, l: 1 = schon gestartet, s: "ja"|"teilweise"|"nein"}}; zu: Karte eingeklappt
  var st = { programme: {}, erledigt: {}, vorhersagen: {}, offen: null, zu: false };
  try {
    var d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
    if (d && typeof d === "object") {
      ["programme", "erledigt", "vorhersagen"].forEach(function (k) { if (d[k] && typeof d[k] === "object") st[k] = d[k]; });
      if (d.offen && typeof d.offen === "object") st.offen = d.offen;
      st.zu = d.zu === true;
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
    $("pfad").hidden = false;
    $("aufgabe").hidden = false;
    $("linkFrei").href = location.pathname;
    document.querySelector(".bk-kopf-seite .eyebrow").textContent = "Turtle · Kurs";
    document.querySelector(".bk-kopf-seite h1").textContent = kurs.titel;
    document.title = kurs.titel + " · Turtle";
    $("knopfKonzepte").hidden = $("menueKonzepte").hidden = !kurs.konzepte.length;
    $("knopfTeilen").textContent = "Programm als Link kopieren";   // «Link zum Teilen kopieren» gilt der Aufgabe
    kurs.reihen.forEach(function (r) { r.aufgaben.forEach(function (a) { a.reiheObj = r; }); });
    bilderAblegen();

    var such = new URLSearchParams(location.search), wahl = alle[such.get("aufgabe")];
    if (!wahl && st.offen) wahl = alle[st.offen.aufgabe];
    if (!wahl) {
      var r = kurs.reihen.filter(function (x) { return x.id === such.get("reihe"); })[0] || kurs.reihen[0];
      wahl = r.aufgaben[0];
    }
    waehleAufgabe(wahl);
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

  /* ---------- Lernpfad: Einheiten und Stationen ---------------- */

  function pflicht(r) { return r.aufgaben.filter(function (a) { return !a.zusatz; }); }
  function fertig(a) { var e = erledigt(a); return !!(e.g || e.s); }
  function stand(r) { var p = pflicht(r); return { n: p.filter(fertig).length, von: p.length }; }
  function kurzname(r, i) {
    if (r.kurz) return r.kurz;
    var m = /^\d+/.exec(r.titel);
    return m ? m[0] : r.titel.charAt(0).toUpperCase() || String(i + 1);
  }

  // Lernkontrolle: empfohlen, wenn die Pflichtaufgaben davor erledigt sind; mit «freigabe»
  // (Anteil) der Reihe erst ab diesem Anteil offen.
  function freigabe(a) {
    if (!a.kontrolle) return null;
    var vorher = a.reiheObj.aufgaben.filter(function (x) { return !x.zusatz && !x.kontrolle; });
    if (!vorher.length) return null;
    var n = vorher.filter(fertig).length, f = a.reiheObj.freigabe;
    if (n >= vorher.length) return null;
    return { n: n, von: vorher.length, gesperrt: f !== undefined && n < Math.ceil(f * vorher.length), anteil: f };
  }

  function einheitenZeigen() {
    var box = $("einheiten"), U = 2 * Math.PI * 16;
    box.textContent = "";
    kurs.reihen.forEach(function (r, i) {
      var s = stand(r), anteil = s.von ? s.n / s.von : 0;
      var b = el("button", "bk-einheit" + (r.weiterfuehrend ? " weiter" : ""));
      b.type = "button";
      b.setAttribute("aria-current", r === aufg.reiheObj ? "true" : "false");
      b.dataset.titel = (r.weiterfuehrend ? "Weiterführend: " : "") + r.titel + " · " + s.n + "/" + s.von;
      b.setAttribute("aria-label", r.titel + ", " + s.n + " von " + s.von + " erledigt");
      b.innerHTML = '<svg viewBox="0 0 38 38" aria-hidden="true"><circle class="grund" cx="19" cy="19" r="16"/>' +
        (anteil ? '<circle class="ring" cx="19" cy="19" r="16" stroke-dasharray="' + (U * anteil).toFixed(1) + " " + U.toFixed(1) + '"/>' : "") + "</svg>";
      b.append(el("span", null, kurzname(r, i)));
      b.addEventListener("click", function () {
        if (r === aufg.reiheObj) return;
        var offen = r.aufgaben.filter(function (x) { return !x.zusatz && !fertig(x); })[0];
        waehleAufgabe(offen || r.aufgaben[0]);
      });
      schildAn(b);
      box.append(b);
    });
    var r = aufg.reiheObj, s = stand(r), t = el("div", "bk-einheit-titel");
    t.append(el("b", null, r.titel));
    if (r.untertitel) t.append(el("small", null, r.untertitel));
    box.append(t, el("span", "bk-stand", s.n + " / " + s.von + " erledigt"));
  }

  function stationenZeigen() {
    var box = $("abschnitte"), gruppen = [], aktuell = null;
    box.textContent = "";
    aufg.reiheObj.aufgaben.forEach(function (a) {
      var g = gruppen[gruppen.length - 1];
      if (!g || (a.abschnitt && a.abschnitt !== g.name)) gruppen.push(g = { name: a.abschnitt || (g ? g.name : ""), liste: [] });
      g.liste.push(a);
    });
    gruppen.forEach(function (g) {
      var ab = el("div", "bk-abschnitt"), halte = el("div", "bk-halte");
      ab.append(el("div", "bk-abschnitt-name", g.name));
      g.liste.forEach(function (a) {
        var e = erledigt(a), fg = freigabe(a);
        var b = el("button", "bk-station" + (a.zusatz ? " zusatz" : "") + (a.kontrolle ? " kontrolle" : "") +
          (e.g ? " geprueft" : e.s ? " selbst" : "") + (fg ? (fg.gesperrt ? " gesperrt" : " spaeter") : ""));
        b.type = "button";
        if ((e.g || e.s) && !a.zusatz) b.textContent = "✓";
        var zustandText = e.g ? "automatisch geprüft" : e.s ? "selbst abgehakt" : fg && fg.gesperrt ? "noch gesperrt" : "";
        b.dataset.titel = (a.zusatz ? "★ " : "") + a.titel + (zustandText ? " · " + zustandText : "");
        b.setAttribute("aria-label", b.dataset.titel + (a.kontrolle ? ", Lernkontrolle" : ""));
        if (a === aufg) { b.classList.add("aktuell"); b.setAttribute("aria-current", "step"); aktuell = b; }
        b.addEventListener("click", function () { waehleAufgabe(a); });
        schildAn(b);
        halte.append(b);
      });
      ab.append(halte);
      box.append(ab);
    });
    if (aktuell) {
      var s = $("strecke"), l = aktuell.offsetLeft - s.clientWidth / 2;
      if (aktuell.offsetLeft < s.scrollLeft || aktuell.offsetLeft > s.scrollLeft + s.clientWidth - 30) s.scrollLeft = Math.max(0, l);
    }
  }

  function pfadZeigen() { einheitenZeigen(); stationenZeigen(); }

  // Titel als Schild über Station oder Einheit (Maus und Tastatur)
  var schild = $("schild");
  function schildAn(b) {
    function zeigen() {
      var r = b.getBoundingClientRect();
      schild.textContent = b.dataset.titel;
      schild.hidden = false;
      var w = schild.offsetWidth, x = Math.min(Math.max(r.left + r.width / 2, w / 2 + 8), innerWidth - w / 2 - 8);
      schild.style.left = x + "px";
      schild.style.top = (r.top - 8) + "px";
    }
    function weg() { schild.hidden = true; }
    b.addEventListener("mouseenter", zeigen);
    b.addEventListener("focus", zeigen);
    b.addEventListener("mouseleave", weg);
    b.addEventListener("blur", weg);
  }
  addEventListener("scroll", function () { schild.hidden = true; }, true);

  /* ---------- Reihenfolge: Zurück und Weiter -------------------- */

  // Der Pfad läuft durch alle Reihen; weiterführende Reihen bilden je einen eigenen Pfad.
  function pfadListe(a) {
    var r = a.reiheObj;
    if (r.weiterfuehrend) return r.aufgaben;
    var l = [];
    kurs.reihen.forEach(function (x) { if (!x.weiterfuehrend) l = l.concat(x.aufgaben); });
    return l;
  }
  function nachbar(schritt) {
    var l = pfadListe(aufg), i = l.indexOf(aufg) + schritt;
    return i >= 0 && i < l.length ? l[i] : null;
  }
  function naviZeigen() {
    var z = nachbar(-1), w = nachbar(1);
    $("knopfZurueck").disabled = !z;
    $("knopfWeiter").disabled = !w;
    $("knopfWeiter").textContent = w && w.reiheObj !== aufg.reiheObj ? "Nächste Einheit ›" : "Weiter ›";
    $("knopfZurueck").title = z ? z.titel : "";
    $("knopfWeiter").title = w ? w.titel : "";
  }
  $("knopfZurueck").addEventListener("click", function () { var z = nachbar(-1); if (z) waehleAufgabe(z); });
  $("knopfWeiter").addEventListener("click", function () { var w = nachbar(1); if (w) waehleAufgabe(w); });

  function einklappenZeigen() {
    $("aufgabe").classList.toggle("zu", st.zu);
    $("einklappen").textContent = st.zu ? "Aufklappen ▾" : "Einklappen ▴";
    $("einklappen").setAttribute("aria-expanded", st.zu ? "false" : "true");
  }
  $("einklappen").addEventListener("click", function () { st.zu = !st.zu; speichern(); einklappenZeigen(); });

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
    reihe = a.reiheObj;
    st.offen = { reihe: reihe.id, aufgabe: a.id };
    speichern();

    var i = reihe.aufgaben.indexOf(a);
    $("aufgabeOrt").textContent = reihe.titel + (a.abschnitt || abschnittVon(a) ? " · " + (a.abschnitt || abschnittVon(a)) : "") +
      " · " + (i + 1) + " von " + reihe.aufgaben.length;
    $("aufgabeName").textContent = (a.zusatz ? "★ " : "") + a.titel;
    etikettenZeigen(a);
    freigabeZeigen(a);
    vorhersageZeigen(a);
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

    var fg = freigabe(a), zu = fg && fg.gesperrt;
    var code = zu ? "# Diese Lernkontrolle ist noch gesperrt.\n" : typeof st.programme[a.id] === "string" ? st.programme[a.id] : startcode(a);
    A.sperren(false);
    A.programmLaden(code, zu ? { name: a.titel, speichern: function () { return true; } } : quelle(a));
    A.sperren(zu);
    $("selbst").disabled = !!zu;
    var k = $("knopfStartcode");
    k.hidden = false;
    k.textContent = a.startcode === undefined && von ? "Programm aus «" + von.titel + "» übernehmen" : "Zurück zum Startcode";

    $("vorlageSchalter").hidden = !a.ziel;
    vorlageSetzen();
    $("pruefung").hidden = true;
    statusZeigen();
    pfadZeigen();
    naviZeigen();
    einklappenZeigen();
    adresseSetzen();
  }
  function abschnittVon(a) {
    var name = "";
    a.reiheObj.aufgaben.some(function (x) { if (x.abschnitt) name = x.abschnitt; return x === a; });
    return name;
  }

  // Hinweis bei Lernkontrollen (und Sperre, wenn die Reihe «freigabe» hat)
  function freigabeZeigen(a) {
    var fg = freigabe(a), p = $("freigabe");
    p.hidden = !fg;
    p.classList.toggle("gesperrt", !!(fg && fg.gesperrt));
    if (!fg) return;
    p.textContent = fg.gesperrt
      ? "Diese Lernkontrolle öffnet sich, wenn Sie mindestens " + Math.round(fg.anteil * 100) + " % der Aufgaben davor erledigt haben (bis jetzt " + fg.n + " von " + fg.von + ")."
      : "Empfohlen, wenn Sie die Aufgaben davor erledigt haben (" + fg.n + " von " + fg.von + ").";
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
    pfadZeigen();
    if (aufg.reiheObj.freigabe !== undefined) freigabeZeigen(aufg);
  });

  /* ---------- Automatische Prüfung ----------------------------- */

  var farbCache = {};
  function farbeGleich(a, b) {
    function n(f) { return farbCache[f] || (farbCache[f] = A.farbeText(f)); }
    return n(a) === n(b);
  }
  function prozent(x) { return Math.floor(x * 100) + " %"; }

  function pruefungZeigen(art, kopf, saetze, knopf) {
    var m = $("pruefung");
    m.className = "bk-meldung" + (art ? " " + art : "");
    m.textContent = "";
    m.append(el("strong", null, kopf));
    saetze.forEach(function (t) { m.append(el("p", null, t)); });
    if (knopf) m.append(knopf);
    m.hidden = false;
  }

  A.hooks.zurueck = function () { $("pruefung").hidden = true; };
  A.hooks.start = function () {
    $("pruefung").hidden = true;
    if (aufg && aufg.vorhersage) {
      var v = vorhersage(aufg);
      if (!v.l) { v.l = 1; speichern(); vergleichZeigen(); }
    }
  };
  A.hooks.vorStart = function () {
    if (!aufg || !aufg.vorhersage) return true;
    var v = vorhersage(aufg);
    if (v.l || vorhersageGenug(v.t)) return true;
    var zur = el("button", "bk-knopf primaer", "Vorhersage aufschreiben"), ohne = el("button", "bk-knopf", "Ohne Vorhersage starten");
    zur.type = ohne.type = "button";
    zur.addEventListener("click", function () {
      if (st.zu) { st.zu = false; speichern(); einklappenZeigen(); }
      $("vorhersageText").focus();
      $("vorhersage").scrollIntoView({ block: "center", behavior: "smooth" });
    });
    ohne.addEventListener("click", function () { $("pruefung").hidden = true; A.starten(); });
    var knoepfe = el("div", "tu-knoepfe");
    knoepfe.append(zur, ohne);
    pruefungZeigen("", "Zuerst vorhersagen", ["Schreiben Sie oben bei der Aufgabe kurz auf, was das Programm zeichnen wird. Danach sehen Sie, ob Sie recht hatten."], knoepfe);
    return false;
  };
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
      pfadZeigen();
      var n = nachbar(1), knopf = null;
      if (n) {
        knopf = el("button", "bk-knopf primaer", n.reiheObj === reihe ? "Nächste Aufgabe" : "Weiter zu «" + n.reiheObj.titel + "»");
        knopf.type = "button";
        knopf.addEventListener("click", function () {
          waehleAufgabe(n);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      pruefungZeigen("ok", "Geschafft", ["Die Zeichnung passt zum Zielbild." + (n ? "" : " Das war die letzte Aufgabe.")], knopf);
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

  /* ---------- Vorhersage ---------------------------------------- */

  function vorhersage(a) { return st.vorhersagen[a.id] || (st.vorhersagen[a.id] = {}); }
  function vorhersageGenug(t) { return !!t && t.trim().replace(/\s+/g, " ").length >= 8; }
  function vorhersageZeigen(a) {
    $("vorhersage").hidden = !a.vorhersage;
    if (!a.vorhersage) return;
    $("vorhersageText").value = (st.vorhersagen[a.id] || {}).t || "";
    vergleichZeigen();
  }
  // Nach dem ersten Start: mit dem Ergebnis vergleichen (die Zeile hat immer dieselbe Höhe)
  function vergleichZeigen() {
    var v = st.vorhersagen[aufg.id] || {}, box = $("vergleich");
    box.textContent = "";
    if (!v.l) { box.append(el("span", null, "Nach dem Start: Vergleichen Sie das Ergebnis mit Ihrer Vorhersage.")); return; }
    box.append(el("span", null, "Stimmte Ihre Vorhersage?"));
    [["ja", "Ja"], ["teilweise", "Teilweise"], ["nein", "Nein"]].forEach(function (w) {
      var b = el("button", "bk-knopf tu-klein", w[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", v.s === w[0] ? "true" : "false");
      b.addEventListener("click", function () { vorhersage(aufg).s = w[0]; speichern(); vergleichZeigen(); });
      box.append(b);
    });
  }
  $("vorhersageText").addEventListener("input", function () {
    vorhersage(aufg).t = this.value.slice(0, 2000);
    speichern();
    if (vorhersageGenug(this.value) && !$("pruefung").hidden && $("pruefung").textContent.indexOf("Zuerst vorhersagen") === 0) $("pruefung").hidden = true;
  });

  /* ---------- Übersicht und Menü -------------------------------- */

  function uebersichtZeigen() {
    var box = $("uebersichtGitter");
    box.textContent = "";
    kurs.reihen.forEach(function (r) {
      var s = stand(r), k = el("section", "tu-ue-einheit" + (r === aufg.reiheObj ? " aktuell" : "") + (r.weiterfuehrend ? " weiter" : ""));
      var h = el("h3");
      h.append(el("span", null, r.titel), el("span", "tu-ue-stand", s.n + "/" + s.von));
      k.append(h);
      if (r.untertitel) k.append(el("p", "tu-ue-unter", r.untertitel));
      var balken = el("div", "tu-balken"), b = el("i");
      b.style.width = (s.von ? 100 * s.n / s.von : 0) + "%";
      balken.append(b);
      k.append(balken);
      var name = null, ul = null;
      r.aufgaben.forEach(function (a) {
        if (!ul || (a.abschnitt && a.abschnitt !== name)) {
          name = a.abschnitt || name;
          if (name) k.append(el("div", "tu-ue-abschnitt", name));
          ul = el("ul", "tu-ue-liste");
          k.append(ul);
        }
        var e = erledigt(a), li = el("li"), knopf = el("button", "tu-ue-aufgabe");
        knopf.type = "button";
        knopf.append(el("i", (a.kontrolle ? "k " : "") + (e.g ? "g" : e.s ? "s" : "")), (a.zusatz ? "★ " : "") + a.titel);
        if (a.kontrolle) knopf.append(el("em", null, "Lernkontrolle"));
        if (a === aufg) knopf.setAttribute("aria-current", "true");
        knopf.setAttribute("aria-label", a.titel + (e.g ? ", automatisch geprüft" : e.s ? ", selbst abgehakt" : ", offen"));
        knopf.addEventListener("click", function () { $("uebersichtDialog").close(); waehleAufgabe(a); });
        li.append(knopf);
        ul.append(li);
      });
      box.append(k);
    });
  }
  $("knopfUebersicht").addEventListener("click", function () {
    uebersichtZeigen();
    $("uebersichtDialog").showModal();
    var a = $("uebersichtGitter").querySelector('[aria-current="true"]');
    if (a) a.focus();
  });
  $("uebersichtZu").addEventListener("click", function () { $("uebersichtDialog").close(); });

  var menue = $("menue");
  function menueZu() { menue.hidden = true; $("knopfMenue").setAttribute("aria-expanded", "false"); }
  $("knopfMenue").addEventListener("click", function (e) {
    e.stopPropagation();
    menue.hidden = !menue.hidden;
    this.setAttribute("aria-expanded", String(!menue.hidden));
  });
  document.addEventListener("click", function (e) { if (!menue.hidden && !menue.contains(e.target)) menueZu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menue.hidden) { menueZu(); $("knopfMenue").focus(); } });
  $("menueKonzepte").addEventListener("click", function () { menueZu(); konzepteOeffnen(); });

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
