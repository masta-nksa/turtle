/* ============================================================
   sw.js – Service Worker: legt alle Dateien im Browser ab, damit die Seite
   nach dem ersten Besuch auch ohne Internet startet.
   - Eigene Dateien: zuerst aus dem Netz (immer aktuell), ohne Netz aus dem Speicher.
   - vendor/ und Schriften: aus dem Speicher (ändern sich nicht).
   - Kurse (kurs.json, Bilder), auch aus anderen *.github.io-Repos: zuerst Netz, sonst Speicher.
   Neue Datei im Repo? In DATEIEN eintragen. vendor/ geändert? VERSION hochzählen.
   ============================================================ */
"use strict";

var VERSION = "turtle-v1";
var DATEIEN = [
  "./",
  "index.html",
  "assets/app.js",
  "assets/basis.css",
  "assets/beispiele.js",
  "assets/favicon.svg",
  "assets/fehlerhilfe.js",
  "assets/kurs.js",
  "assets/kursmodus.js",
  "assets/oberflaeche.css",
  "assets/pruefung.js",
  "assets/turtle.css",
  "laufzeit/skulpt.html",
  "vendor/closebrackets.js",
  "vendor/codemirror.css",
  "vendor/codemirror.js",
  "vendor/lz-string.min.js",
  "vendor/matchbrackets.js",
  "vendor/python.js",
  "vendor/skulpt-stdlib.js",
  "vendor/skulpt.min.js"
];
var SCHRIFTEN = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(DATEIEN); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (alle) {
    // «turtle-kurse» (von der Seite abgelegte Kurse) bleibt
    return Promise.all(alle.filter(function (k) { return k.indexOf("turtle-v") === 0 && k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function ablegen(anfrage, antwort) {
  if (antwort && (antwort.ok || antwort.type === "opaque")) {
    var kopie = antwort.clone();
    caches.open(VERSION).then(function (c) { c.put(anfrage, kopie); });
  }
  return antwort;
}

self.addEventListener("fetch", function (e) {
  var anfrage = e.request;
  if (anfrage.method !== "GET") return;
  var url = new URL(anfrage.url);

  // Schriften und vendor/: zuerst Speicher
  if (SCHRIFTEN.indexOf(url.hostname) >= 0 ||
      (url.origin === location.origin && url.pathname.indexOf("/vendor/") >= 0)) {
    e.respondWith(caches.match(anfrage).then(function (r) {
      return r || fetch(anfrage).then(function (a) { return ablegen(anfrage, a); });
    }));
    return;
  }
  if (url.origin !== location.origin && !/\.github\.io$/.test(url.hostname)) return;

  // Eigene Dateien: zuerst Netz, ohne Netz aus dem Speicher (Adresse ohne ?… und #…)
  e.respondWith(fetch(anfrage).then(function (a) { return ablegen(anfrage, a); }).catch(function () {
    return caches.match(anfrage, { ignoreSearch: true }).then(function (r) {
      return r || (anfrage.mode === "navigate" ? caches.match("index.html") : Response.error());
    });
  }));
});
