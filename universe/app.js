/* HMR Universe: memory spectrum, ego tags, QR-style ID mock-ups, and a planet sketcher saved only in this browser. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function el(t, a, kids) {
    var e = document.createElement(t), k;
    for (k in (a || {})) { if (k === "text") e.textContent = a[k]; else e.setAttribute(k, a[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function idOf(s) { return "UI-" + hash(s).toString(36).toUpperCase().padStart(7, "0").slice(0, 7); }

  /* QR-style mock: 21x21 grid with three finder squares, seeded by the object's name */
  function qr(seedText) {
    var ns = "http://www.w3.org/2000/svg", N = 21, r = rng(hash(seedText));
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "-1 -1 " + (N + 2) + " " + (N + 2)); svg.setAttribute("class", "qr"); svg.setAttribute("aria-hidden", "true");
    var bg = document.createElementNS(ns, "rect"); bg.setAttribute("x", -1); bg.setAttribute("y", -1); bg.setAttribute("width", N + 2); bg.setAttribute("height", N + 2); bg.setAttribute("fill", "#fff"); svg.appendChild(bg);
    function finder(x, y) { return (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9); }
    var d = "";
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { if (!finder(x, y) && r() > 0.52) d += "M" + x + " " + y + "h1v1h-1z"; }
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(function (p) { d += "M" + p[0] + " " + p[1] + "h7v7h-7zM" + (p[0] + 1) + " " + (p[1] + 1) + "v5h5v-5zM" + (p[0] + 2) + " " + (p[1] + 2) + "h3v3h-3z"; });
    var path = document.createElementNS(ns, "path"); path.setAttribute("d", d); path.setAttribute("fill", "#1b1530"); path.setAttribute("fill-rule", "evenodd"); svg.appendChild(path);
    return svg;
  }

  /* remember-everything spectrum */
  var MEM = [
    "Remember everything. It knows exactly who it is and keeps every power. The most powerful of the most powerful: a superhero no one can beat, having some fun.",
    "Remember most things. It knows it is more than this body, and it can bend a few rules when it really matters.",
    "Remember some things. Flashes of something bigger: deep intuition, strange luck, a sense of having been here before.",
    "Remember almost nothing. A normal life, with rare moments where a person gets in touch with who they really are.",
    "Remember nothing. A whole life lived without knowing. That is what Earth has mostly been."
  ];
  var mem = $("#mem"), out = $("#mem-out");
  function memShow() { out.textContent = MEM[+mem.value]; mem.setAttribute("aria-valuetext", MEM[+mem.value].split(".")[0]); }
  if (mem) { mem.addEventListener("input", memShow); memShow(); }

  /* ego tags */
  var egos = $("#egos");
  if (egos) {
    [["A sweet kid", "on a planet made 75 million years ago"], ["The bully", "same planet, same school"], ["The superhero", "the universal intelligence, remembering everything"], ["Kid ↔ superhero", "a relationship gets its own tag too"]].forEach(function (e) {
      egos.appendChild(el("div", { "class": "ego" }, [el("span", { "class": "ego-id", text: "EGO " + idOf(e[0]).slice(3) }), el("b", { text: e[0] }), el("span", { "class": "small", text: e[1] })]));
    });
  }

  /* linked ID chain */
  var chain = $("#chain");
  function card(kind, name, parent) {
    var c = el("div", { "class": "obj" }, [qr(kind + name), el("span", { "class": "kind", text: kind }), el("b", { text: name }), el("code", { text: idOf(kind + name) })]);
    if (parent) c.appendChild(el("span", { "class": "small", text: "linked to " + idOf(parent) }));
    return c;
  }
  if (chain) {
    var objs = [["Planet", "Earth"], ["City", "A coastal city"], ["Person", "Someone who lives there"], ["Pet", "Their dog"]];
    objs.forEach(function (o, i) { chain.appendChild(card(o[0], o[1], i ? objs[i - 1][0] + objs[i - 1][1] : null)); });
  }

  /* planet sketcher, saved only in this browser */
  var KEY = "elv.universe.planets.v1", planets = [];
  try { planets = JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { planets = []; }
  var mine = $("#mine"), MEML = ["everything", "most things", "some things", "almost nothing", "nothing"];
  function draw() {
    mine.textContent = "";
    if (!planets.length) return;
    mine.appendChild(el("h3", { text: "Your planets" }));
    planets.forEach(function (p, i) {
      var c = card("Planet", p.n, null);
      c.appendChild(el("p", { text: p.q ? "Testing: " + p.q : "Testing: to be decided." }));
      c.appendChild(el("p", { "class": "small", text: "Its people remember " + MEML[p.m] + "." }));
      var rm = el("button", { type: "button", "class": "btn", text: "Remove" });
      rm.addEventListener("click", function () { planets.splice(i, 1); store(); draw(); });
      c.appendChild(rm);
      mine.appendChild(c);
    });
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(planets)); } catch (e) { } }
  var form = $("#builder");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var n = $("#p-name").value.trim(); if (!n) { $("#p-name").focus(); return; }
      planets.unshift({ n: n.slice(0, 40), q: $("#p-q").value.trim().slice(0, 300), m: Math.max(0, Math.min(4, +$("#p-m").value || 0)) });
      planets = planets.slice(0, 30); store(); draw(); form.reset(); $("#p-name").focus();
    });
    draw();
  }
})();
