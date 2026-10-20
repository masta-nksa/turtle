/* ============================================================
   pruefung.js – vergleicht eine Zeichnung mit dem Zielbild einer Aufgabe.
   Ohne DOM, auch mit node testbar. Geprüft wird nur das Ergebnis, nie der Code.

   Linien: Ziel und Zeichnung werden in kleinen Abständen abgetastet. Abdeckung = Anteil der
   Zielpunkte mit gezeichnetem Punkt in der Nähe (≤ toleranz), Genauigkeit = Anteil der
   gezeichneten Punkte mit Zielpunkt in der Nähe. So spielen Reihenfolge, Richtung, doppelt
   gezeichnete Linien und die Annäherung von Kreisen durch kurze Strecken keine Rolle.
   Punkte (dot): jeder Zielpunkt muss vorkommen, keiner zu viel. Flächen: Überlappung der
   gerasterten Flächen; Linien auf dem Rand oder innerhalb einer Zielfläche gelten nicht als
   daneben (der Rand wird oft mitgezeichnet). Farben nur, wo das Ziel eine verlangt.
   ============================================================ */
(function (global) {
  "use strict";

  var VORGABE = { toleranz: 6, schwelle: 0.95, flaecheSchwelle: 0.9 };

  function zahl(x) { return typeof x === "number" && isFinite(x); }

  // Zielelemente in Grundteile zerlegen: Strecken, Punkte, Flächen
  function zerlegen(ziel) {
    var teile = { strecken: [], punkte: [], flaechen: [] };
    (ziel.elemente || []).forEach(function (el) {
      var f = el.farbe || null;
      function zug(p, zu) {
        for (var i = 1; i < p.length; i++) teile.strecken.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], f]);
        if (zu && p.length > 2) teile.strecken.push([p[p.length - 1][0], p[p.length - 1][1], p[0][0], p[0][1], f]);
      }
      if (el.art === "strecke") zug([el.von, el.bis]);
      else if (el.art === "linienzug") zug(el.punkte, !!el.geschlossen);
      else if (el.art === "kreis") zug(bogenPunkte(el), false);
      else if (el.art === "punkt") teile.punkte.push([el.ort[0], el.ort[1], el.groesse || 0, f]);
      else if (el.art === "flaeche") {
        teile.flaechen.push({ punkte: el.punkte, farbe: f });
        if (el.rand) zug(el.punkte, true);
      }
    });
    return teile;
  }

  // Kreis oder Bogen als feiner Linienzug; Winkel in Grad, gegen den Uhrzeigersinn ab der x-Achse
  function bogenPunkte(el) {
    var von = zahl(el.von) ? el.von : 0, bis = zahl(el.bis) ? el.bis : von + 360;
    var r = el.radius, n = Math.max(12, Math.ceil(Math.abs(bis - von) / 360 * 2 * Math.PI * r / 2)), p = [];
    for (var i = 0; i <= n; i++) {
      var w = (von + (bis - von) * i / n) * Math.PI / 180;
      p.push([el.mitte[0] + r * Math.cos(w), el.mitte[1] + r * Math.sin(w)]);
    }
    return p;
  }

  // Strecken abtasten: [x, y, farbe]
  function abtasten(strecken, schritt) {
    var p = [];
    strecken.forEach(function (s) {
      var dx = s[2] - s[0], dy = s[3] - s[1], l = Math.sqrt(dx * dx + dy * dy);
      var n = Math.max(1, Math.ceil(l / schritt));
      for (var i = 0; i <= n; i++) p.push([s[0] + dx * i / n, s[1] + dy * i / n, s[4]]);
    });
    return p;
  }

  // Raster mit Zellen der Grösse g: schnelle Suche nach Punkten in der Nähe
  function raster(punkte, g) {
    var r = {};
    punkte.forEach(function (p) {
      var k = Math.floor(p[0] / g) + "," + Math.floor(p[1] / g);
      (r[k] || (r[k] = [])).push(p);
    });
    return r;
  }
  function inDerNaehe(r, g, p, tol, farbe, gleich) {
    var cx = Math.floor(p[0] / g), cy = Math.floor(p[1] / g), t2 = tol * tol;
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      var z = r[(cx + i) + "," + (cy + j)];
      if (!z) continue;
      for (var k = 0; k < z.length; k++) {
        var dx = z[k][0] - p[0], dy = z[k][1] - p[1];
        if (dx * dx + dy * dy <= t2 && (!farbe || gleich(farbe, z[k][2]))) return true;
      }
    }
    return false;
  }

  function anteil(liste, test) {
    if (!liste.length) return 1;
    var n = 0;
    for (var i = 0; i < liste.length; i++) if (test(liste[i])) n++;
    return n / liste.length;
  }

  // Flächen auf ein Raster legen (Zellmitten im Polygon, Gerade-Ungerade-Regel)
  function imPolygon(x, y, p) {
    var drin = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) drin = !drin;
    }
    return drin;
  }
  function flaechenRaster(flaechen, g, rahmen) {
    var zellen = {};
    flaechen.forEach(function (f) {
      var p = f.punkte;
      for (var x = rahmen[0]; x <= rahmen[2]; x += g) for (var y = rahmen[1]; y <= rahmen[3]; y += g) {
        if (imPolygon(x + g / 2, y + g / 2, p)) zellen[x + "," + y] = true;
      }
    });
    return zellen;
  }
  function rahmenVon(flaechen) {
    var r = [Infinity, Infinity, -Infinity, -Infinity];
    flaechen.forEach(function (f) {
      f.punkte.forEach(function (q) {
        r[0] = Math.min(r[0], q[0]); r[1] = Math.min(r[1], q[1]);
        r[2] = Math.max(r[2], q[0]); r[3] = Math.max(r[3], q[1]);
      });
    });
    return r;
  }
  function ueberlappung(ziel, gez, g) {
    var alle = ziel.concat(gez);
    if (!ziel.length) return 1;
    var r = rahmenVon(alle);
    r = [Math.floor(r[0] / g) * g, Math.floor(r[1] / g) * g, r[2], r[3]];
    var a = flaechenRaster(ziel, g, r), b = flaechenRaster(gez, g, r), schnitt = 0, vereinigt = 0, k;
    for (k in a) { vereinigt++; if (b[k]) schnitt++; }
    for (k in b) if (!a[k]) vereinigt++;
    return vereinigt ? schnitt / vereinigt : 1;
  }

  /* Vergleich. zeichnung: {strecken: [[x1,y1,x2,y2,farbe,breite]], punkte: [[x,y,groesse,farbe]],
     flaechen: [{punkte, farbe}]}. farbeGleich(a, b): vergleicht zwei Farbangaben (die Seite
     rechnet über den Browser um; ohne Angabe nur exakt gleiche Texte). */
  function vergleiche(ziel, zeichnung, farbeGleich) {
    var tol = zahl(ziel.toleranz) ? ziel.toleranz : VORGABE.toleranz;
    var schwelle = zahl(ziel.schwelle) ? ziel.schwelle : VORGABE.schwelle;
    var gleich = farbeGleich || function (a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); };
    var z = zerlegen(ziel), schritt = Math.min(1, tol / 4);
    var zp = abtasten(z.strecken, schritt), gp = abtasten(zeichnung.strecken || [], schritt);
    var gr = raster(gp, tol), zr = raster(zp, tol);
    var randPunkte = [];
    z.flaechen.forEach(function (f) {
      var p = f.punkte;
      for (var i = 0; i < p.length; i++) {
        var q = p[(i + 1) % p.length];
        randPunkte.push([p[i][0], p[i][1], q[0], q[1], null]);
      }
    });
    var rr = raster(abtasten(randPunkte, schritt), tol);
    function erlaubt(p) {
      if (inDerNaehe(zr, tol, p, tol, null, gleich) || inDerNaehe(rr, tol, p, tol, null, gleich)) return true;
      for (var i = 0; i < z.flaechen.length; i++) if (imPolygon(p[0], p[1], z.flaechen[i].punkte)) return true;
      return false;
    }

    var abdeckung = anteil(zp, function (p) { return inDerNaehe(gr, tol, p, tol, p[2], gleich); });
    var abdeckungOhneFarbe = anteil(zp, function (p) { return inDerNaehe(gr, tol, p, tol, null, gleich); });
    var genauigkeit = anteil(gp, erlaubt);

    // Punkte: jeder Zielpunkt einmal, Grösse ungefähr gleich
    var gezPunkte = (zeichnung.punkte || []).slice(), punkteFehlen = 0;
    z.punkte.forEach(function (zpu) {
      for (var i = 0; i < gezPunkte.length; i++) {
        var q = gezPunkte[i], dx = q[0] - zpu[0], dy = q[1] - zpu[1];
        var groesseOk = !zpu[2] || Math.abs(q[2] - zpu[2]) <= Math.max(tol, zpu[2] * 0.3);
        if (dx * dx + dy * dy <= tol * tol && groesseOk && (!zpu[3] || gleich(zpu[3], q[3]))) { gezPunkte.splice(i, 1); return; }
      }
      punkteFehlen++;
    });
    var punkteZuviel = z.punkte.length ? gezPunkte.length : 0;

    // Flächen: je Zielfarbe (oder alle ohne Farbe) die Überlappung
    var flaechenWert = 1, gezFl = zeichnung.flaechen || [];
    if (z.flaechen.length) {
      var gruppen = {};
      z.flaechen.forEach(function (f) { var k = f.farbe || ""; (gruppen[k] || (gruppen[k] = [])).push(f); });
      Object.keys(gruppen).forEach(function (k) {
        var passend = gezFl.filter(function (f) { return !k || gleich(k, f.farbe); });
        flaechenWert = Math.min(flaechenWert, ueberlappung(gruppen[k], passend, Math.max(2, tol / 2)));
      });
    }

    var linienOk = abdeckung >= schwelle && genauigkeit >= schwelle;
    return {
      ok: linienOk && !punkteFehlen && !punkteZuviel && flaechenWert >= VORGABE.flaecheSchwelle,
      abdeckung: abdeckung, abdeckungOhneFarbe: abdeckungOhneFarbe, genauigkeit: genauigkeit,
      punkteFehlen: punkteFehlen, punkteZuviel: punkteZuviel,
      flaechen: z.flaechen.length ? flaechenWert : null,
      farbeFalsch: abdeckung < schwelle && abdeckungOhneFarbe >= schwelle,
      leer: !gp.length && !(zeichnung.punkte || []).length && !gezFl.length
    };
  }

  /* Zielbild-Werkzeug: aus einer Zeichnung ein «ziel» für kurs.json. Aneinanderhängende Strecken
     gleicher Farbe werden zu Linienzügen, fast gerade Stücke vereinfacht (Douglas-Peucker). */
  function runden(x) { return Math.round(x * 10) / 10; }
  function vereinfachen(p, eps) {
    if (p.length < 3) return p;
    var a = p[0], b = p[p.length - 1], max = 0, idx = 0;
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy);
    for (var i = 1; i < p.length - 1; i++) {
      var d = l ? Math.abs(dy * p[i][0] - dx * p[i][1] + b[0] * a[1] - b[1] * a[0]) / l
        : Math.sqrt(Math.pow(p[i][0] - a[0], 2) + Math.pow(p[i][1] - a[1], 2));
      if (d > max) { max = d; idx = i; }
    }
    if (max <= eps) return [a, b];
    return vereinfachen(p.slice(0, idx + 1), eps).slice(0, -1).concat(vereinfachen(p.slice(idx), eps));
  }
  function zielAusZeichnung(zeichnung, mitFarbe, farbeText) {
    var ft = farbeText || function (f) { return f; }, elemente = [], zug = null;
    function abschliessen() {
      if (!zug) return;
      var p = vereinfachen(zug.punkte, 0.3).map(function (q) { return [runden(q[0]), runden(q[1])]; });
      var el = { art: "linienzug", punkte: p };
      if (mitFarbe) el.farbe = ft(zug.farbe);
      elemente.push(el);
      zug = null;
    }
    (zeichnung.strecken || []).forEach(function (s) {
      var ende = zug && zug.punkte[zug.punkte.length - 1];
      if (zug && Math.abs(ende[0] - s[0]) < 0.01 && Math.abs(ende[1] - s[1]) < 0.01 && zug.farbe === s[4]) {
        zug.punkte.push([s[2], s[3]]);
        return;
      }
      abschliessen();
      zug = { punkte: [[s[0], s[1]], [s[2], s[3]]], farbe: s[4] };
    });
    abschliessen();
    (zeichnung.punkte || []).forEach(function (q) {
      var el = { art: "punkt", ort: [runden(q[0]), runden(q[1])], groesse: q[2] };
      if (mitFarbe) el.farbe = ft(q[3]);
      elemente.push(el);
    });
    (zeichnung.flaechen || []).forEach(function (f) {
      // Flächen nicht vereinfachen, nur doppelte Punkte weglassen (auch den Schlusspunkt = Anfang)
      var p = [];
      f.punkte.forEach(function (q) {
        q = [runden(q[0]), runden(q[1])];
        var l = p[p.length - 1];
        if (!l || l[0] !== q[0] || l[1] !== q[1]) p.push(q);
      });
      if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
      if (p.length < 3) return;
      var el = { art: "flaeche", punkte: p };
      if (mitFarbe) el.farbe = ft(f.farbe);
      elemente.push(el);
    });
    return { elemente: elemente };
  }

  var api = { vergleiche: vergleiche, zerlegen: zerlegen, zielAusZeichnung: zielAusZeichnung, VORGABE: VORGABE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.TurtlePruefung = api;
})(this);
