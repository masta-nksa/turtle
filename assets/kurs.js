/* ============================================================
   kurs.js – Kursadresse auflösen und kurs.json streng prüfen.
   Ohne DOM, auch mit node testbar. Texte bleiben Text: Es wird nie HTML aus dem Kurs übernommen.
   ============================================================ */
(function (global) {
  "use strict";

  var FORMAT = 1;
  var TEIL = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  var BESITZER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
  var KENNUNG = /^[a-z0-9][a-z0-9_-]{0,39}$/;
  var BILD = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:png|jpe?g|gif|svg|webp)$/;
  var MAX = { titel: 120, text: 6000, konzeptText: 30000, code: 20000, liste: 30, eintrag: 1000,
    reihen: 30, aufgaben: 80, konzepte: 40, elemente: 2000, punkte: 20000, koordinate: 5000 };

  /* ?kurs=repo/kurs → <Ursprung des Tools>/repo/kurs/ (gleicher Ursprung, neben dem Tool)
     ?kurs=besitzer/repo/kurs → https://besitzer.github.io/repo/kurs/
     tool: Adresse des Tools, z. B. https://masta-nksa.github.io/turtle/ */
  function adresse(wert, tool) {
    if (typeof wert !== "string" || !wert) return null;
    var t = wert.replace(/\/+$/, "").split("/"), u = new URL(tool), basis, kennung;
    if (t.some(function (s) { return !TEIL.test(s) || s.indexOf("..") >= 0; }))
      throw new Error("Die Kursadresse «" + wert + "» ist ungültig.");
    if (t.length === 2) {
      basis = new URL("../" + t[0] + "/" + t[1] + "/", u).href;
      kennung = t[0] + "/" + t[1];
    } else if (t.length === 3) {
      if (!BESITZER.test(t[0])) throw new Error("Die Kursadresse «" + wert + "» ist ungültig.");
      var host = t[0].toLowerCase() + ".github.io";
      if (host === u.hostname) return adresse(t[1] + "/" + t[2], tool);
      basis = "https://" + host + "/" + t[1] + "/" + t[2] + "/";
      kennung = t[0].toLowerCase() + "/" + t[1] + "/" + t[2];
    } else throw new Error("Die Kursadresse «" + wert + "» hat nicht die Form «repo/kurs» oder «besitzer/repo/kurs».");
    return { wert: wert, kennung: kennung, basis: basis, datei: basis + "kurs.json" };
  }

  /* ---------- Prüfen ---------------------------------------- */

  function Fehler(wo, was) { return new Error((wo ? wo + ": " : "") + was); }
  function text(v, wo, max, pflicht) {
    if (v === undefined || v === null) { if (pflicht) throw Fehler(wo, "fehlt."); return undefined; }
    if (typeof v !== "string") throw Fehler(wo, "muss ein Text sein.");
    if (v.length > max) throw Fehler(wo, "ist zu lang (höchstens " + max + " Zeichen).");
    if (pflicht && !v.trim()) throw Fehler(wo, "ist leer.");
    return v;
  }
  function textListe(v, wo) {
    if (v === undefined) return undefined;
    if (!Array.isArray(v) || v.length > MAX.liste) throw Fehler(wo, "muss eine Liste mit höchstens " + MAX.liste + " Texten sein.");
    return v.map(function (x, i) { return text(x, wo + " " + (i + 1), MAX.eintrag, true); });
  }
  function janein(v, wo) {
    if (v === undefined) return false;
    if (typeof v !== "boolean") throw Fehler(wo, "muss true oder false sein.");
    return v;
  }
  function kennungPruefen(v, wo) {
    if (typeof v !== "string" || !KENNUNG.test(v)) throw Fehler(wo, "«id» muss aus Kleinbuchstaben, Ziffern, - und _ bestehen (höchstens 40 Zeichen).");
    return v;
  }
  function punktPruefen(p, wo) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(function (x) { return typeof x === "number" && isFinite(x) && Math.abs(x) <= MAX.koordinate; }))
      throw Fehler(wo, "Punkte sind [x, y] mit Zahlen zwischen −" + MAX.koordinate + " und " + MAX.koordinate + ".");
    return [p[0], p[1]];
  }
  function zahlPruefen(v, wo, min, max) {
    if (typeof v !== "number" || !isFinite(v) || v < min || v > max) throw Fehler(wo, "muss eine Zahl zwischen " + min + " und " + max + " sein.");
    return v;
  }

  function zielPruefen(z, wo) {
    if (z === undefined) return undefined;
    if (!z || typeof z !== "object" || !Array.isArray(z.elemente) || !z.elemente.length || z.elemente.length > MAX.elemente)
      throw Fehler(wo, "«ziel» braucht eine Liste «elemente» (1 bis " + MAX.elemente + ").");
    var anzahl = 0, ziel = { elemente: [] };
    if (z.toleranz !== undefined) ziel.toleranz = zahlPruefen(z.toleranz, wo + ", toleranz", 1, 50);
    if (z.schwelle !== undefined) ziel.schwelle = zahlPruefen(z.schwelle, wo + ", schwelle", 0.5, 1);
    z.elemente.forEach(function (e, i) {
      var w = wo + ", Element " + (i + 1), el = { art: e && e.art };
      if (!e || typeof e !== "object") throw Fehler(w, "ist kein Objekt.");
      function liste(p, min) {
        if (!Array.isArray(p) || p.length < min) throw Fehler(w, "braucht mindestens " + min + " Punkte.");
        anzahl += p.length;
        if (anzahl > MAX.punkte) throw Fehler(wo, "hat zu viele Punkte.");
        return p.map(function (q) { return punktPruefen(q, w); });
      }
      if (e.art === "strecke") { el.von = punktPruefen(e.von, w); el.bis = punktPruefen(e.bis, w); }
      else if (e.art === "linienzug") { el.punkte = liste(e.punkte, 2); el.geschlossen = janein(e.geschlossen, w); }
      else if (e.art === "kreis") {
        el.mitte = punktPruefen(e.mitte, w);
        el.radius = zahlPruefen(e.radius, w + ", radius", 0.5, MAX.koordinate);
        if (e.von !== undefined) el.von = zahlPruefen(e.von, w + ", von", -3600, 3600);
        if (e.bis !== undefined) el.bis = zahlPruefen(e.bis, w + ", bis", -3600, 3600);
      }
      else if (e.art === "punkt") {
        el.ort = punktPruefen(e.ort, w);
        if (e.groesse !== undefined) el.groesse = zahlPruefen(e.groesse, w + ", groesse", 0, 1500);
      }
      else if (e.art === "flaeche") { el.punkte = liste(e.punkte, 3); el.rand = janein(e.rand, w); }
      else throw Fehler(w, "«art» muss strecke, linienzug, kreis, punkt oder flaeche sein.");
      if (e.farbe !== undefined) {
        if (typeof e.farbe !== "string" || !/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30})$/.test(e.farbe)) throw Fehler(w, "«farbe» ist ein Farbname oder #rrggbb.");
        el.farbe = e.farbe;
      }
      ziel.elemente.push(el);
    });
    return ziel;
  }

  var AUFGABE_FELDER = ["id", "titel", "abschnitt", "text", "fragen", "hinweise", "konzepte", "startcode", "weiterVon",
    "vorhersage", "zusatz", "kontrolle", "bild", "ziel", "checkliste", "bedingungen"];

  function aufgabePruefen(a, wo, warnungen) {
    if (!a || typeof a !== "object") throw Fehler(wo, "ist kein Objekt.");
    Object.keys(a).forEach(function (k) { if (AUFGABE_FELDER.indexOf(k) < 0) warnungen.push(wo + ": unbekanntes Feld «" + k + "» wird übergangen."); });
    var b = {
      id: kennungPruefen(a.id, wo),
      titel: text(a.titel, wo + ", titel", MAX.titel, true),
      abschnitt: text(a.abschnitt, wo + ", abschnitt", MAX.titel),
      text: text(a.text, wo + ", text", MAX.text, true),
      fragen: textListe(a.fragen, wo + ", fragen"),
      hinweise: textListe(a.hinweise, wo + ", hinweise"),
      checkliste: textListe(a.checkliste, wo + ", checkliste"),
      startcode: text(a.startcode, wo + ", startcode", MAX.code),
      vorhersage: janein(a.vorhersage, wo + ", vorhersage"),
      zusatz: janein(a.zusatz, wo + ", zusatz"),
      kontrolle: janein(a.kontrolle, wo + ", kontrolle"),
      ziel: zielPruefen(a.ziel, wo)
    };
    b.titel = b.titel.trim();
    if (a.konzepte !== undefined) {
      if (!Array.isArray(a.konzepte) || a.konzepte.length > 12) throw Fehler(wo, "«konzepte» ist eine Liste von Konzept-ids.");
      b.konzepte = a.konzepte.map(function (k) { return kennungPruefen(k, wo + ", konzepte"); });
    }
    if (a.weiterVon !== undefined) b.weiterVon = kennungPruefen(a.weiterVon, wo + ", weiterVon");
    if (a.bild !== undefined) {
      if (typeof a.bild !== "string" || !BILD.test(a.bild)) throw Fehler(wo, "«bild» ist ein Pfad im Kursordner wie «bilder/stern.png».");
      b.bild = a.bild;
    }
    // reserviert für Zusatzbedingungen (z. B. höchstens n Zeilen); noch ohne Wirkung
    if (a.bedingungen !== undefined && !Array.isArray(a.bedingungen)) throw Fehler(wo, "«bedingungen» muss eine Liste sein.");
    if (a.bedingungen && a.bedingungen.length) warnungen.push(wo + ": «bedingungen» werden noch nicht geprüft.");
    return b;
  }

  function pruefe(d) {
    var warnungen = [];
    if (!d || typeof d !== "object") throw Fehler("kurs.json", "ist kein Objekt.");
    if (d.format !== FORMAT) throw Fehler("kurs.json", "«format» muss " + FORMAT + " sein.");
    var kurs = {
      titel: text(d.titel, "kurs.json, titel", MAX.titel, true),
      untertitel: text(d.untertitel, "kurs.json, untertitel", MAX.eintrag),
      konzepte: [], reihen: []
    };
    var konzeptIds = {}, aufgabeIds = {};
    if (d.konzepte !== undefined) {
      if (!Array.isArray(d.konzepte) || d.konzepte.length > MAX.konzepte) throw Fehler("kurs.json", "«konzepte» ist eine Liste.");
      d.konzepte.forEach(function (k, i) {
        var wo = "Konzept " + (i + 1);
        if (!k || typeof k !== "object") throw Fehler(wo, "ist kein Objekt.");
        var id = kennungPruefen(k.id, wo);
        if (konzeptIds[id]) throw Fehler(wo, "die id «" + id + "» kommt doppelt vor.");
        konzeptIds[id] = true;
        kurs.konzepte.push({ id: id, titel: text(k.titel, wo + ", titel", MAX.titel, true), text: text(k.text, wo + ", text", MAX.konzeptText, true) });
      });
    }
    if (!Array.isArray(d.reihen) || !d.reihen.length || d.reihen.length > MAX.reihen) throw Fehler("kurs.json", "«reihen» braucht 1 bis " + MAX.reihen + " Reihen.");
    var reiheIds = {};
    d.reihen.forEach(function (r, i) {
      var wo = "Reihe " + (i + 1);
      if (!r || typeof r !== "object") throw Fehler(wo, "ist kein Objekt.");
      var reihe = {
        id: kennungPruefen(r.id, wo),
        titel: text(r.titel, wo + ", titel", MAX.titel, true),
        untertitel: text(r.untertitel, wo + ", untertitel", MAX.eintrag),
        weiterfuehrend: janein(r.weiterfuehrend, wo + ", weiterfuehrend"),
        aufgaben: []
      };
      // kurz: Beschriftung im Lernpfad (sonst Nummer am Anfang des Titels bzw. erster Buchstabe)
      if (r.kurz !== undefined) {
        if (typeof r.kurz !== "string" || !/^\S{1,3}$/.test(r.kurz)) throw Fehler(wo, "«kurz» hat 1 bis 3 Zeichen.");
        reihe.kurz = r.kurz;
      }
      // freigabe: Lernkontrollen öffnen sich erst ab diesem Anteil erledigter Aufgaben davor
      if (r.freigabe !== undefined) reihe.freigabe = zahlPruefen(r.freigabe, wo + ", freigabe", 0, 1);
      if (reiheIds[reihe.id]) throw Fehler(wo, "die id «" + reihe.id + "» kommt doppelt vor.");
      reiheIds[reihe.id] = true;
      if (!Array.isArray(r.aufgaben) || !r.aufgaben.length || r.aufgaben.length > MAX.aufgaben)
        throw Fehler(wo, "«aufgaben» braucht 1 bis " + MAX.aufgaben + " Aufgaben.");
      r.aufgaben.forEach(function (a, j) {
        var b = aufgabePruefen(a, wo + ", Aufgabe " + (j + 1), warnungen);
        if (aufgabeIds[b.id]) throw Fehler(wo + ", Aufgabe " + (j + 1), "die id «" + b.id + "» kommt doppelt vor (ids gelten für den ganzen Kurs).");
        if (b.weiterVon && !aufgabeIds[b.weiterVon]) throw Fehler(wo + ", Aufgabe " + (j + 1), "«weiterVon» muss eine frühere Aufgabe nennen.");
        aufgabeIds[b.id] = b;
        b.reihe = reihe.id;
        reihe.aufgaben.push(b);
      });
      kurs.reihen.push(reihe);
    });
    kurs.reihen.forEach(function (r) {
      r.aufgaben.forEach(function (a) {
        (a.konzepte || []).forEach(function (k) {
          if (!konzeptIds[k]) warnungen.push("Aufgabe «" + a.id + "»: Konzept «" + k + "» gibt es nicht.");
        });
        if (a.konzepte) a.konzepte = a.konzepte.filter(function (k) { return konzeptIds[k]; });
      });
    });
    return { kurs: kurs, warnungen: warnungen, aufgaben: aufgabeIds };
  }

  /* Text in Blöcke zerlegen (die Seite baut daraus DOM, nur mit textContent):
     Leerzeile = neuer Absatz, ```…``` = Codeblock, `…` = Code im Text, «- » am Zeilenanfang = Aufzählung,
     «## » am Zeilenanfang = Zwischentitel. */
  function bloecke(t) {
    var teile = [], zeilen = String(t).replace(/\r\n?/g, "\n").split("\n"), i = 0, absatz = [];
    function absatzEnde() {
      if (!absatz.length) return;
      if (absatz.every(function (z) { return /^- /.test(z); })) teile.push({ art: "liste", eintraege: absatz.map(function (z) { return inline(z.slice(2)); }) });
      else teile.push({ art: "absatz", zeilen: absatz.map(inline) });
      absatz = [];
    }
    while (i < zeilen.length) {
      var z = zeilen[i];
      if (/^```/.test(z.trim())) {
        absatzEnde();
        var code = [];
        i++;
        while (i < zeilen.length && !/^```/.test(zeilen[i].trim())) code.push(zeilen[i++]);
        teile.push({ art: "code", text: code.join("\n") });
        i++;
        continue;
      }
      if (/^## /.test(z)) { absatzEnde(); teile.push({ art: "titel", text: z.slice(3).trim() }); }
      else if (!z.trim()) absatzEnde(); else absatz.push(z);
      i++;
    }
    absatzEnde();
    return teile;
  }
  function inline(z) {
    var teile = [], re = /`([^`]+)`/g, m, pos = 0;
    while ((m = re.exec(z))) {
      if (m.index > pos) teile.push({ text: z.slice(pos, m.index) });
      teile.push({ code: m[1] });
      pos = re.lastIndex;
    }
    if (pos < z.length) teile.push({ text: z.slice(pos) });
    return teile;
  }

  var api = { adresse: adresse, pruefe: pruefe, bloecke: bloecke, FORMAT: FORMAT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.TurtleKurs = api;
})(this);
