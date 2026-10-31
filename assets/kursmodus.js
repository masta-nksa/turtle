/* ============================================================
   kursmodus.js – Kurs mit Reihen (Einheiten) und Aufgaben (?kurs=…).
   Lernpfad: Einheiten als Kreise mit Fortschritt, Aufgaben als Stationen einer Linie,
   die ganze Liste im Fenster «Übersicht». Kursdaten (kurs.js) erscheinen nur als Text.
   Jede Aufgabe hat ihr eigenes Programm; Fortschritt, Programme und Vorhersagen bleiben im
   Browser (turtle.kurs.<kurs>.v1). Erledigt ist eine Aufgabe, wenn die Zeichnung zum Zielbild
   passt (pruefung.js) und die Fragen «vorher»/«nachher» richtig beantwortet sind, oder wenn sie
   selbst abgehakt ist; beides wird getrennt gespeichert.
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
  // teile: {id: {l: gestartet, e: ein Lauf zu Ende, z: Zielbild erreicht, v: Vorhersage (Nummer oder Zahl),
  //   r: aufgelöst, vf: Vorhersage stimmte, vo: «vorher» richtig, vw: letzte falsche Antwort danach,
  //   vk: richtige Antwort danach, n: «nachher» richtig, nw: letzte Antwort zu «nachher»}}
  var st = { programme: {}, erledigt: {}, vorhersagen: {}, teile: {}, offen: null, zu: false };
  try {
    var d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
    if (d && typeof d === "object") {
      ["programme", "erledigt", "vorhersagen", "teile"].forEach(function (k) { if (d[k] && typeof d[k] === "object") st[k] = d[k]; });
      if (d.offen && typeof d.offen === "object") st.offen = d.offen;
      st.zu = d.zu === true;
    }
  } catch (e) { /* ohne gespeicherten Stand */ }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(st)); return true; } catch (e) { return false; }
  }
  function erledigt(a) { return st.erledigt[a.id] || {}; }
  function teil(a) { return st.teile[a.id] || (st.teile[a.id] = {}); }
  function teilVon(a) { return st.teile[a.id] || {}; }

  // Automatisch erledigt, wenn alle Teile stimmen: Zielbild, Frage vorher, Frage nachher,
  // bei «ausprobieren» der erste Start. Aufgaben ohne solche Teile hakt man selbst ab.
  function automatisch(a) { return !!(a.ziel || a.vorher || a.nachher || a.art === "ausprobieren"); }
  function fehlt(a) {
    var t = teilVon(a), l = [];
    if (a.art === "ausprobieren" && !t.l) l.push("einmal starten");
    if (a.vorher && !t.vo) l.push("Frage «Vorher»");
    if (a.ziel && !t.z) l.push("Zielbild");
    if (a.nachher && !t.n) l.push("Frage «Nachher»");
    return l;
  }
  function abschliessen(a) {
    if (!automatisch(a) || fehlt(a).length || erledigt(a).g) return false;
    var e = st.erledigt[a.id] || {};
    e.g = 1;
    st.erledigt[a.id] = e;
    speichern();
    if (a === aufg) { statusZeigen(); pfadZeigen(); }
    return true;
  }
  function artName(a) { return a.kontrolle ? "Selbstkontrolle" : a.art ? K.ARTEN[a.art] : ""; }
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

  // Selbstkontrolle (kontrolle): empfohlen, wenn die Pflichtaufgaben davor erledigt sind; mit «freigabe»
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
    if (r.untertitel) { t.append(el("small", null, r.untertitel)); t.title = r.titel + ": " + r.untertitel; }
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
        var b = el("button", "bk-station" + (a.zusatz ? " zusatz" : "") + (a.kontrolle ? " kontrolle" : "") + (a.art === "werkstatt" ? " werkstatt" : "") +
          (e.g ? " geprueft" : e.s ? " selbst" : "") + (fg ? (fg.gesperrt ? " gesperrt" : " spaeter") : ""));
        b.type = "button";
        if ((e.g || e.s) && !a.zusatz) b.textContent = "✓";
        var zustandText = e.g ? "automatisch geprüft" : e.s ? "selbst abgehakt" : fg && fg.gesperrt ? "noch gesperrt" : "";
        b.dataset.titel = (a.zusatz ? "★ " : "") + (artName(a) ? artName(a) + ": " : "") + a.titel + (zustandText ? " · " + zustandText : "");
        b.setAttribute("aria-label", b.dataset.titel);
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

  var werkzeug = new URLSearchParams(location.search).get("werkzeug") || "";
  function adresseSetzen() {
    try {
      var u = location.pathname + "?kurs=" + adr.wert + "&reihe=" + reihe.id + "&aufgabe=" + aufg.id +
        (/^(ziel|frage)$/.test(werkzeug) ? "&werkzeug=" + werkzeug : "");
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
    ideenZeigen(a);
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
    var code = zu ? "# Diese Selbstkontrolle ist noch gesperrt.\n" : typeof st.programme[a.id] === "string" ? st.programme[a.id] : startcode(a);
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
    if (werkzeug === "frage") { $("fwId").value = a.id; $("fwId").dispatchEvent(new Event("input")); }
    frageZeigen("vorher");
    frageZeigen("nachher");
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

  // Hinweis bei Selbstkontrollen (und Sperre, wenn die Reihe «freigabe» hat)
  function freigabeZeigen(a) {
    var fg = freigabe(a), p = $("freigabe");
    p.hidden = !fg;
    p.classList.toggle("gesperrt", !!(fg && fg.gesperrt));
    if (!fg) return;
    p.textContent = fg.gesperrt
      ? "Diese Selbstkontrolle öffnet sich, wenn Sie mindestens " + Math.round(fg.anteil * 100) + " % der Aufgaben davor erledigt haben (bis jetzt " + fg.n + " von " + fg.von + ")."
      : "Empfohlen, wenn Sie die Aufgaben davor erledigt haben (" + fg.n + " von " + fg.von + ").";
  }

  function etikettenZeigen(a) {
    var box = $("etiketten");
    box.textContent = "";
    if (a.zusatz) box.append(el("span", "tu-etikett zusatz", "★ Zusatzaufgabe"));
    if (a.kontrolle) box.append(el("span", "tu-etikett kontrolle", "Selbstkontrolle"));
    else if (a.art) box.append(el("span", "tu-etikett art", K.ARTEN[a.art]));
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

  // Hinweise gestuft wie in Kara: jeder weitere erst auf Klick; bei Selbstkontrollen keine
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
    var f = fehlt(aufg);
    s.textContent = e.g ? (aufg.ziel ? "✓ Automatisch geprüft: Die Zeichnung passt zum Zielbild." : "✓ Automatisch geprüft.")
      : e.s ? "✓ Selbst als erledigt markiert."
        : !automatisch(aufg) ? "Noch offen."
          : f.length === 1 && f[0] === "Zielbild" ? "Noch offen. Nach «Start» wird die Zeichnung mit dem Zielbild verglichen."
            : f.length === 1 && f[0] === "einmal starten" ? "Noch offen. Starten Sie das Programm einmal."
              : "Noch offen: " + f.join(", ") + ".";
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
    if (aufg && !teilVon(aufg).l) {
      teil(aufg).l = 1;
      speichern();
      if (!abschliessen(aufg)) statusZeigen();
    }
    if (aufg && aufg.vorhersage) {
      var v = vorhersage(aufg);
      if (!v.l) { v.l = 1; speichern(); vergleichZeigen(); }
    }
  };
  A.hooks.vorStart = function () {
    if (aufg && aufg.vorher) {
      var t = teilVon(aufg);
      if (t.l || t.v !== undefined) return true;
      var zu = el("button", "bk-knopf primaer", "Zur Frage «Vorher»"), oh = el("button", "bk-knopf", "Ohne Vorhersage starten");
      zu.type = oh.type = "button";
      zu.addEventListener("click", function () {
        $("vorherBox").scrollIntoView({ block: "center", behavior: "smooth" });
        var b = $("vorherAntworten").querySelector("button, input");
        if (b) b.focus({ preventScroll: true });
      });
      oh.addEventListener("click", function () { $("pruefung").hidden = true; A.starten(); });
      var kn = el("div", "tu-knoepfe");
      kn.append(zu, oh);
      pruefungZeigen("", "Zuerst vorhersagen", ["Beantworten Sie zuerst die Frage «Vorher». Danach sehen Sie, ob Sie recht hatten."], kn);
      return false;
    }
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
  // Ein Lauf ist zu Ende (auch mit Fehler): Vorhersage auflösen, Frage «nachher» ohne Zielbild öffnen
  function laufEnde() {
    if (!aufg) return;
    var t = teil(aufg), neu = !t.e;
    t.e = 1;
    if (aufg.vorher && t.l && !t.r) {
      t.r = 1;
      if (t.v !== undefined && K.antwortRichtig(aufg, "vorher", t.v)) { t.vf = 1; t.vo = 1; }
      speichern();
      frageZeigen("vorher");
      abschliessen(aufg);
    } else if (neu) speichern();
    if (neu && aufg.nachher && !aufg.ziel) frageZeigen("nachher");
  }
  A.hooks.fehler = laufEnde;
  A.hooks.fertig = function (zeichnung, wartet) {
    laufEnde();
    if (!aufg || !aufg.ziel || !zeichnung) return;
    if (zeichnung.voll) { pruefungZeigen("", "Nicht geprüft", ["Das Programm hat sehr viel gezeichnet; so viel kann nicht verglichen werden."]); return; }
    var r = P.vergleiche(aufg.ziel, zeichnung, farbeGleich);
    if (r.ok) {
      var t = teil(aufg), n = nachbar(1);
      if (!t.z) { t.z = 1; speichern(); frageZeigen("nachher"); }
      if (!abschliessen(aufg)) statusZeigen();
      var offen = fehlt(aufg);
      if (offen.length) {
        var zur = null;
        if (aufg.nachher && !t.n) {
          zur = el("button", "bk-knopf primaer", "Zur Frage «Nachher»");
          zur.type = "button";
          zur.addEventListener("click", function () {
            $("nachherBox").scrollIntoView({ block: "center", behavior: "smooth" });
            var b = $("nachherAntworten").querySelector("button, input");
            if (b) b.focus({ preventScroll: true });
          });
        }
        pruefungZeigen("ok", "Die Zeichnung passt", ["Die Zeichnung passt zum Zielbild. Noch offen: " + offen.join(", ") + "."], zur);
        return;
      }
      pruefungZeigen("ok", "Geschafft", ["Die Zeichnung passt zum Zielbild." + (n ? "" : " Das war die letzte Aufgabe.")], naechsteKnopf());
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

  function naechsteKnopf() {
    var n = nachbar(1);
    if (!n) return null;
    var knopf = el("button", "bk-knopf primaer", n.reiheObj === reihe ? "Nächste Aufgabe" : "Weiter zu «" + n.reiheObj.titel + "»");
    knopf.type = "button";
    knopf.addEventListener("click", function () {
      waehleAufgabe(n);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return knopf;
  }

  /* ---------- Fragen vorher und nachher ------------------------- */

  // vorher: vor dem ersten Start wählen (noch ohne Bewertung), nach dem Lauf aufgelöst; danach
  // weiter wählen, bis die Antwort stimmt. nachher: erscheint, wenn das Zielbild erreicht ist
  // (ohne Zielbild nach dem ersten Lauf), und wird sofort bewertet. Beide Boxen stehen unter dem
  // Feld: Was beim Ausführen dazukommt, verschiebt nur, was darunter liegt.
  function antwortName(f, w) {
    if (f.typ === "zahl") return String(w);
    var x = f.antworten[w];
    return x ? (x.text || "Bild " + (Number(w) + 1)) : "?";
  }
  function frageZeigen(art) {
    var f = aufg[art], box = $(art + "Box"), t = teilVon(aufg);
    var offen = !!f && (art === "vorher" || (aufg.ziel ? !!t.z : !!t.e));
    box.hidden = !offen;
    if (!offen) return;
    var p = $(art + "Text");
    p.textContent = "";
    zeileFuellen(p, flach(f.text));
    var liste = $(art + "Antworten"), vorab = art === "vorher" && !t.r;
    var fertigJetzt = art === "vorher" ? t.vo : t.n;
    liste.textContent = "";
    if (f.typ === "zahl") {
      var inp = el("input", "bk-zahl"), k = el("button", "bk-knopf", vorab ? "Vorhersage festhalten" : "Prüfen");
      inp.type = "text";
      inp.setAttribute("inputmode", "decimal");
      inp.setAttribute("autocomplete", "off");
      inp.setAttribute("aria-label", "Ihre Antwort (Zahl)");
      var alt = art === "vorher" ? (t.vo ? null : t.r ? t.vw : t.v) : t.nw;
      if (fertigJetzt) { inp.value = art === "vorher" ? (t.vf ? t.v : t.vk) : t.nw; inp.disabled = true; k.hidden = true; }
      else if (alt !== undefined && alt !== null) inp.value = alt;
      k.type = "button";
      k.addEventListener("click", function () { antworten(art, inp.value); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); antworten(art, inp.value); } });
      liste.append(inp, k);
    } else {
      f.antworten.forEach(function (x, i) {
        var b = el("button", "bk-chip" + (x.bild ? " bild" : ""));
        b.type = "button";
        if (x.bild) {
          b.append(miniBild(x.bild));
          b.append(el("span", null, x.text || "Bild " + (i + 1)));
          b.setAttribute("aria-label", x.text || "Bild " + (i + 1));
        } else b.textContent = x.text;
        if (vorab && t.v === i) b.classList.add("gewaehlt");
        if (fertigJetzt && K.antwortRichtig(aufg, art, i)) b.classList.add("richtig");
        else if (!fertigJetzt && (art === "vorher" ? (t.r && (t.vw === i || (t.vw === undefined && t.v === i))) : t.nw === i)) b.classList.add("falsch");
        b.setAttribute("aria-pressed", b.classList.contains("gewaehlt") || b.classList.contains("richtig") ? "true" : "false");
        b.addEventListener("click", function () { antworten(art, i); });
        liste.append(b);
      });
    }
    rueckZeigen(art);
  }
  function rueckZeigen(art, hinweis) {
    var f = aufg[art], t = teilVon(aufg), r = $(art + "Rueck");
    r.className = "bk-frage-rueck";
    r.textContent = "";
    function satz(kopf, rest) { if (kopf) r.append(el("strong", null, kopf + " ")); zeileFuellen(r, flach(rest || "")); }
    if (hinweis) { satz("", hinweis); return; }
    if (art === "vorher" && !t.r) {
      if (t.v === undefined) satz("", f.typ === "zahl" ? "Schreiben Sie Ihre Vorhersage auf, dann «Start»." : "Wählen Sie eine Antwort, dann «Start».");
      else satz("", "Ihre Vorhersage: «" + antwortName(f, t.v) + "». Drücken Sie jetzt «Start» und vergleichen Sie.");
      return;
    }
    var ok = art === "vorher" ? t.vo : t.n;
    if (ok) {
      r.classList.add("ok");
      satz(art === "vorher" && t.vf ? "Richtig vorhergesagt." : "Richtig.", f.erklaerung);
      if (erledigt(aufg).g && art === (aufg.nachher ? "nachher" : "vorher")) {
        var n = naechsteKnopf();
        if (n) { r.append(el("br")); r.append(n); }
      }
      return;
    }
    if (art === "vorher") {
      r.classList.add("fehler");
      if (t.v === undefined) satz("Ohne Vorhersage gestartet.", "Was hat das Programm gemacht? Wählen Sie jetzt die passende Antwort.");
      else if (t.vw === undefined) satz("Nicht ganz.", "Sie hatten «" + antwortName(f, t.v) + "» vorhergesagt. Vergleichen Sie mit dem Ergebnis und wählen Sie nochmals.");
      else satz("Noch nicht.", "Schauen Sie sich das Programm und das Ergebnis nochmals Zeile für Zeile an.");
      return;
    }
    if (t.nw === undefined) { r.hidden = false; satz("", f.typ === "zahl" ? "Geben Sie eine Zahl ein." : "Wählen Sie eine Antwort."); return; }
    r.classList.add("fehler");
    satz("Noch nicht.", f.typ === "zahl" ? "Rechnen Sie nochmals nach, am besten mit Ihrem Programm vor Augen." : "Schauen Sie sich Ihr Programm und die Zeichnung nochmals an.");
  }
  function antworten(art, wert) {
    var f = aufg[art], t = teil(aufg);
    if (f.typ === "zahl") {
      wert = K.zahlText(wert);
      if (wert === null) { rueckZeigen(art, "Geben Sie zuerst eine Zahl ein."); return; }
    }
    if (art === "vorher" && !t.r) {
      t.v = wert;
      speichern();
      var m = $("pruefung");
      if (!m.hidden && m.textContent.indexOf("Zuerst vorhersagen") === 0) m.hidden = true;
      frageZeigen(art);
      return;
    }
    if (art === "vorher" ? t.vo : t.n) return;
    var ok = K.antwortRichtig(aufg, art, wert);
    if (art === "vorher") { if (ok) { t.vo = 1; t.vk = wert; } else t.vw = wert; }
    else { if (ok) t.n = 1; t.nw = wert; }
    speichern();
    abschliessen(aufg);
    frageZeigen(art);
    statusZeigen();
  }

  // Kleines Bild einer Antwort (Elemente wie bei «ziel»), Koordinaten wie in Turtle
  var SVG = "http://www.w3.org/2000/svg";
  function svgEl(tag, att) {
    var e = document.createElementNS(SVG, tag);
    Object.keys(att).forEach(function (k) { e.setAttribute(k, att[k]); });
    return e;
  }
  function miniBild(ziel) {
    var z = P.zerlegen(ziel), xs = [], ys = [];
    z.strecken.forEach(function (q) { xs.push(q[0], q[2]); ys.push(q[1], q[3]); });
    z.punkte.forEach(function (q) { var r = Math.max(3, (q[2] || 6) / 2); xs.push(q[0] - r, q[0] + r); ys.push(q[1] - r, q[1] + r); });
    z.flaechen.forEach(function (fl) { fl.punkte.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
    if (!xs.length) { xs = [0]; ys = [0]; }
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var h = Math.max(x1 - x0, y1 - y0, 20) / 2 * 1.15, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    function f(x) { return Math.round(x * 10) / 10; }
    var svg = svgEl("svg", { viewBox: [f(cx - h), f(-cy - h), f(2 * h), f(2 * h)].join(" "), "aria-hidden": "true" });
    var g = svgEl("g", { transform: "scale(1,-1)", fill: "none", stroke: "currentColor", "stroke-width": f(h / 22), "stroke-linecap": "round", "stroke-linejoin": "round" });
    z.flaechen.forEach(function (fl) {
      g.append(svgEl("polygon", { points: fl.punkte.map(function (q) { return f(q[0]) + "," + f(q[1]); }).join(" "), fill: fl.farbe || "currentColor", stroke: "none", opacity: "0.8" }));
    });
    var gruppen = {};
    z.strecken.forEach(function (q) { var k = q[4] || ""; (gruppen[k] || (gruppen[k] = [])).push("M" + f(q[0]) + " " + f(q[1]) + "L" + f(q[2]) + " " + f(q[3])); });
    Object.keys(gruppen).forEach(function (k) { g.append(svgEl("path", k ? { d: gruppen[k].join(""), stroke: k } : { d: gruppen[k].join("") })); });
    z.punkte.forEach(function (q) { g.append(svgEl("circle", { cx: f(q[0]), cy: f(q[1]), r: f(Math.max(3, (q[2] || 6) / 2)), fill: q[3] || "currentColor", stroke: "none" })); });
    svg.append(g);
    return svg;
  }

  /* ---------- Ideenkarten (Werkstatt) --------------------------- */

  function ideenZeigen(a) {
    var box = $("ideen"), liste = $("ideenListe");
    liste.textContent = "";
    box.hidden = !a.ideen;
    (a.ideen || []).forEach(function (idee) {
      var d = el("details", "tu-idee"), t = el("div", "tu-text");
      d.append(el("summary", null, idee.titel));
      textZeigen(t, idee.text);
      d.append(t);
      if (idee.startcode !== undefined) {
        var b = el("button", "bk-knopf tu-klein", "Startcode dieser Idee übernehmen");
        b.type = "button";
        b.addEventListener("click", function () {
          if (!confirm("Ihr Programm für diese Aufgabe durch den Startcode der Idee «" + idee.titel + "» ersetzen? Das lässt sich nicht rückgängig machen.")) return;
          st.programme[aufg.id] = idee.startcode;
          speichern();
          A.programmLaden(idee.startcode, quelle(aufg));
        });
        d.append(b);
      }
      liste.append(d);
    });
  }

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
        if (artName(a)) knopf.append(el("em", null, artName(a)));
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
