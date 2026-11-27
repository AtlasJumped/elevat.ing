/* Family mental health: tabs, human-trials dialog, and the whole-family assessment.
   Everything stays in this browser (localStorage). Nothing is sent anywhere. */
(function () {
  "use strict";
  document.documentElement.className += " js";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(t, a, kids) {
    var e = document.createElement(t), k;
    for (k in (a || {})) {
      if (k === "text") e.textContent = a[k];
      else if (k === "html") e.innerHTML = a[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), a[k]);
      else if (a[k] !== null && a[k] !== undefined) e.setAttribute(k, a[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  /* ---------- tabs (hash based, so each tab can be linked) ---------- */
  var TABS = ["who", "model", "assess", "solution"];
  function show(id, focus) {
    if (TABS.indexOf(id) < 0) id = "who";
    TABS.forEach(function (t) {
      var p = document.getElementById(t), tab = document.getElementById("tab-" + t);
      var on = t === id;
      if (on) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
    if (focus) {
      var nav = $(".tabs");
      window.scrollTo(0, Math.max(0, nav.offsetTop - 2));
      document.getElementById(id).focus({ preventScroll: true });
    }
  }
  window.addEventListener("hashchange", function () { show(location.hash.slice(1), true); });
  $("#tablist").addEventListener("keydown", function (e) {
    var cur = TABS.indexOf(location.hash.slice(1)); if (cur < 0) cur = 0;
    var n = e.key === "ArrowRight" ? cur + 1 : e.key === "ArrowLeft" ? cur - 1 : null;
    if (n === null) return;
    e.preventDefault(); n = (n + TABS.length) % TABS.length;
    location.hash = TABS[n]; document.getElementById("tab-" + TABS[n]).focus();
  });
  show(location.hash.slice(1), false);

  /* ---------- human trials dialog ---------- */
  var modal = $("#trials"), lastFocus = null;
  function openTrials(e) { lastFocus = e && e.currentTarget; modal.removeAttribute("hidden"); $("#trials-close").focus(); }
  function closeTrials() { modal.setAttribute("hidden", ""); if (lastFocus) lastFocus.focus(); }
  $("#trials-open").addEventListener("click", openTrials);
  $$("[data-trials]").forEach(function (b) { b.addEventListener("click", openTrials); });
  $("#trials-close").addEventListener("click", closeTrials);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeTrials(); });
  document.addEventListener("keydown", function (e) {
    if (modal.hasAttribute("hidden")) return;
    if (e.key === "Escape") closeTrials();
    if (e.key === "Tab") {
      var f = $$("button, a[href]", modal); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- the model's spectrums ---------- */
  var ZONES = ["Exceptional", "Above average", "Population average", "Below average", "Extremely deficient"];
  var TRAITS = [
    ["Strengths", [
      ["intel", "Intelligence", "a quick, deep thinker", "great difficulty understanding everyday things"],
      ["humor", "Wit and humor", "brings lightness and laughter", "no humor, or humor that hurts people"],
      ["kind", "Kindness and warmth", "consistently caring", "cold or cruel"],
      ["listen", "Listening", "truly hears people out", "never lets anyone finish"]]],
    ["Model of reality", [
      ["reality", "Grip on shared reality", "sees the world clearly and checks the facts", "firmly believes things nearly everyone else sees as untrue"],
      ["self", "Sense of self", "an accurate, steady picture of who they are", "their picture of themselves is far from how others see them"],
      ["insight", "Insight into their own patterns", "notices and owns their patterns", "believes nothing is wrong, even when everyone sees it"],
      ["frame", "Respect for other frameworks", "understands others hold different beliefs, faiths and views", "treats anyone who sees it differently as crazy or bad"]]],
    ["Relationships", [
      ["bound", "Respect for boundaries", "respects other people's limits", "ignores other people's limits"],
      ["control", "Letting go of control", "lets others do things their own way", "needs everything done their way"],
      ["feedback", "Response to feedback and criticism", "takes it in and changes", "attacks back or shuts down"],
      ["trust", "Trust and suspicion", "trusting, with good judgment", "suspicious of everyone, sees plots"],
      ["fair", "Fairness in blame", "checks the facts before blaming", "frequent accusations that are not true"],
      ["empathy", "Empathy", "feels with others and makes room for them", "everything is about them"],
      ["honest", "Honesty", "truthful, even when it is hard", "lies often"]]],
    ["Inner weather", [
      ["anxiety", "Calm under pressure", "steady when things get hard", "overwhelming anxiety"],
      ["mood", "Mood stability", "moods are even and fit the moment", "extreme swings"],
      ["anger", "Temper", "handles anger well", "explosive or frightening anger"]]],
    ["Daily life", [
      ["care", "Self-care", "looks after body, sleep, money and home", "cannot look after themselves"],
      ["society", "Getting along with society", "does well with work, neighbors and community, and is open to their feedback", "constant conflict with the world around them"]]]
  ];
  var ALL = []; TRAITS.forEach(function (g) { g[1].forEach(function (t) { ALL.push(t); }); });
  var TNAME = {}; ALL.forEach(function (t) { TNAME[t[0]] = t[1]; });

  /* ---------- storage ---------- */
  var KEY = "elv.familyhealth.v1";
  var S = load();
  function blank() { return { people: [], rater: "", subject: "", a: {} }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.people && s.a) return s; } catch (e) { } return blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function k(r, s) { return r + "\u0001" + s; }
  function rec(r, s) { var x = S.a[k(r, s)]; if (!x) { x = S.a[k(r, s)] = { v: {}, warned: false }; } return x; }
  function stats(r, s) {
    var x = S.a[k(r, s)], ans = 0, skip = 0;
    if (x) ALL.forEach(function (t) { var v = x.v[t[0]]; if (v === "skip") skip++; else if (v) ans++; });
    return { ans: ans, skip: skip, filled: ans + skip, total: ALL.length };
  }

  var app = $("#app");
  if (!app) return;
  function render() {
    app.textContent = "";
    app.appendChild(stepPeople());
    if (S.people.length >= 2) {
      app.appendChild(stepWho());
      if (S.rater && S.subject) app.appendChild(stepForm());
      app.appendChild(stepMatrix());
      app.appendChild(stepReport());
      app.appendChild(stepShare());
    }
  }

  /* keep progress and report current while someone answers, without redrawing the sliders */
  function refresh() {
    var m = $("#fh-matrix"), r = $("#fh-report");
    if (m) m.parentNode.replaceChild(stepMatrix(), m);
    if (r) r.parentNode.replaceChild(stepReport(), r);
  }

  /* step 1: the family */
  function stepPeople() {
    var box = el("div", { "class": "step" }, [el("h3", { text: "1. Your family" }),
      el("p", { "class": "small", text: "Add everyone taking part, yourself included. Use nicknames or roles (for example Parent 1, Sibling 2). Names stay in this browser." })]);
    var ul = el("ul", { "class": "people", "aria-label": "People taking part" });
    S.people.forEach(function (p) {
      ul.appendChild(el("li", {}, [p, el("button", { type: "button", "aria-label": "Remove " + p, text: "×", onclick: function () {
        if (!confirm("Remove " + p + " and every answer by or about them?")) return;
        S.people = S.people.filter(function (q) { return q !== p; });
        Object.keys(S.a).forEach(function (kk) { var pr = kk.split("\u0001"); if (pr[0] === p || pr[1] === p) delete S.a[kk]; });
        if (S.rater === p) S.rater = ""; if (S.subject === p) S.subject = "";
        save(); render();
      } })]));
    });
    box.appendChild(ul);
    var inp = el("input", { type: "text", id: "fh-add", maxlength: "30", autocomplete: "off", placeholder: "e.g. Parent 1" });
    function add() {
      var v = inp.value.replace(/[\u0001<>]/g, "").trim();
      if (!v) { inp.focus(); return; }
      if (S.people.indexOf(v) >= 0) { msg.textContent = v + " is already on the list."; return; }
      S.people.push(v); save(); render(); var n = $("#fh-add"); if (n) n.focus();
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    var msg = el("p", { "class": "small", role: "status" });
    box.appendChild(el("div", { "class": "row" }, [el("label", { "for": "fh-add" }, ["Add a person", inp]), el("button", { type: "button", "class": "btn primary", text: "Add", onclick: add })]));
    box.appendChild(msg);
    if (S.people.length < 2) box.appendChild(el("p", { "class": "small", text: "Add at least two people to begin." }));
    box.appendChild(el("p", {}, [el("button", { type: "button", "class": "btn", text: "Try a made-up example family", onclick: example })]));
    return box;
  }

  /* step 2: who rates whom */
  function stepWho() {
    var box = el("div", { "class": "step" }, [el("h3", { text: "2. Who is filling this in, and about whom?" })]);
    function sel(id, label, val, cb, selfLabel) {
      var s = el("select", { id: id }, [el("option", { value: "", text: "Choose" })]);
      S.people.forEach(function (p) { var o = el("option", { value: p, text: p + (selfLabel && p === S.rater ? " (yourself)" : "") }); if (p === val) o.selected = true; s.appendChild(o); });
      s.addEventListener("change", function () { cb(s.value); save(); render(); var n = $("#" + id); if (n) n.focus(); });
      return el("label", { "for": id }, [label, s]);
    }
    box.appendChild(el("div", { "class": "row" }, [
      sel("fh-rater", "I am", S.rater, function (v) { S.rater = v; }),
      sel("fh-subject", "I am assessing", S.subject, function (v) { S.subject = v; }, true)]));
    if (S.rater) {
      var left = S.people.filter(function (p) { return stats(S.rater, p).filled < ALL.length; });
      box.appendChild(el("p", { "class": "small", text: left.length ? S.rater + " still has " + left.length + " of " + S.people.length + " people to assess (themselves included)." : S.rater + " has assessed everyone. Thank you." }));
    }
    return box;
  }

  /* step 3: the sliders */
  function stepForm() {
    var r = S.rater, s = S.subject, x = rec(r, s);
    var box = el("div", { "class": "step", id: "fh-form" }, [el("h3", { text: "3. " + r + " assessing " + (r === s ? "themselves" : s) })]);
    box.appendChild(el("p", { "class": "small", text: "For each spectrum, click the zone that fits best. The middle (3) is the population average. 1 is exceptional; 5 is extremely deficient. If you would rather not answer, press \"I prefer not to fill this one in\"." }));
    var prog = el("p", { "class": "progress", role: "status", "aria-live": "polite" });
    var note = el("p", { "class": "notice", role: "alert", hidden: "" , text: "Heads up: this option is meant to be used sparingly. For this tool to work, we suggest you leave fewer than three spectrums blank. You can keep going, and leave out as many as you want. The model just may not work as well." });
    box.appendChild(prog); box.appendChild(note);
    function upd() {
      var st = stats(r, s);
      prog.textContent = st.filled + " of " + st.total + " done" + (st.skip ? " (" + st.skip + " left out)" : "") + (st.filled === st.total ? ". Complete." : "");
      if (st.skip >= 3) note.removeAttribute("hidden"); else note.setAttribute("hidden", "");
      refresh();
    }
    TRAITS.forEach(function (g) {
      box.appendChild(el("h4", { "class": "group-h", text: g[0] }));
      g[1].forEach(function (t) { box.appendChild(traitRow(t, x, upd)); });
    });
    upd();
    box.appendChild(el("p", {}, [el("a", { "class": "btn primary", href: "#fh-matrix", text: "See family progress" })]));
    return box;
  }
  function bellSVG() {
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 500 62"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
    var fills = [["zfill", "M0 60 L100 60 L100 52 C60 58 30 60 0 60Z"], ["zfill2", "M100 60 L200 60 L200 22 C160 33 130 46 100 52Z"], ["zfill3", "M200 60 L300 60 L300 22 C270 4 230 4 200 22Z"], ["zfill2", "M300 60 L400 60 L400 52 C370 46 340 33 300 22Z"], ["zfill", "M400 60 L500 60 C470 60 440 58 400 52Z"], ["curve", "M0 60 C60 60 80 56 100 52 S160 33 200 22 S230 4 250 4 S280 10 300 22 S360 46 400 52 S470 60 500 60"]];
    fills.forEach(function (f) { var p = document.createElementNS(ns, "path"); p.setAttribute("class", f[0]); p.setAttribute("d", f[1]); svg.appendChild(p); });
    return svg;
  }
  function traitRow(t, x, upd) {
    var id = t[0], v = x.v[id];
    var row = el("div", { "class": "trait" + (v === "skip" ? " skipped" : v ? " answered" : "") });
    row.appendChild(el("h4", { id: "h-" + id, text: t[1] }));
    row.appendChild(el("p", { "class": "ends", text: "1: " + t[2] + ". 5: " + t[3] + "." }));
    var bell = el("div", { "class": "bell" });
    bell.appendChild(bellSVG());
    var fs = el("fieldset", { "class": "zones" }, [el("legend", { text: t[1] })]);
    var thumb = el("i", { "class": "thumb" });
    function place(n) { thumb.style.left = (n * 20 - 10) + "%"; $$("label", fs).forEach(function (l, i) { l.classList.toggle("on", i + 1 === n); }); }
    for (var n = 1; n <= 5; n++) {
      (function (n) {
        var inp = el("input", { type: "radio", name: "z-" + id, value: String(n), "aria-label": n + ", " + ZONES[n - 1] });
        if (v === n) inp.checked = true;
        if (v === "skip") inp.disabled = true;
        inp.addEventListener("change", function () { x.v[id] = n; save(); row.classList.add("answered"); place(n); upd(); });
        fs.appendChild(el("label", { title: n + ": " + ZONES[n - 1] }, [inp, el("span", { text: String(n) })]));
      })(n);
    }
    bell.appendChild(fs);
    bell.appendChild(el("div", { "class": "track" }, [thumb]));
    if (typeof v === "number") place(v);
    row.appendChild(bell);
    row.appendChild(el("div", { "class": "zlabels", "aria-hidden": "true" }, [el("span", { text: "Exceptional" }), el("span", { text: "Average" }), el("span", { text: "Extremely deficient" })]));
    var sk = el("button", { type: "button", "class": "skipbtn", "aria-pressed": v === "skip" ? "true" : "false", text: "I prefer not to fill this one in" });
    sk.addEventListener("click", function () {
      var on = sk.getAttribute("aria-pressed") !== "true";
      sk.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { x.v[id] = "skip"; row.classList.add("skipped"); row.classList.remove("answered"); $$("input", fs).forEach(function (i) { i.checked = false; i.disabled = true; }); place(0); }
      else { delete x.v[id]; row.classList.remove("skipped"); $$("input", fs).forEach(function (i) { i.disabled = false; }); }
      save(); upd();
    });
    row.appendChild(sk);
    return row;
  }

  /* step 4: completion matrix */
  function stepMatrix() {
    var box = el("div", { "class": "step", id: "fh-matrix" }, [el("h3", { text: "4. Family progress" }),
      el("p", { "class": "small", text: "Rows are who filled it in; columns are who it is about. Left-out spectrums count as done: the family can still truthfully say the assessment is 100% complete." })]);
    var done = 0, total = S.people.length * S.people.length;
    var head = el("tr", {}, [el("th", { scope: "col", text: "Filled in by" })]);
    S.people.forEach(function (p) { head.appendChild(el("th", { scope: "col", text: "About " + p })); });
    var body = el("tbody");
    S.people.forEach(function (r) {
      var tr = el("tr", {}, [el("th", { scope: "row", text: r })]);
      S.people.forEach(function (s) {
        var st = stats(r, s), full = st.filled === st.total; if (full) done++;
        var cell = el("td", {}, [el("button", { type: "button", "class": "btn", style: "min-height:36px;padding:4px 10px;font-size:.85rem", text: full ? "Done" : st.filled ? st.filled + "/" + st.total : "Start", "aria-label": r + " about " + s + ": " + (full ? "done" : st.filled + " of " + st.total), onclick: function () { S.rater = r; S.subject = s; save(); render(); var f = $("#fh-form"); if (f) f.scrollIntoView(); } })]);
        if (full) cell.firstChild.className = "btn primary";
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    box.appendChild(el("div", { "class": "tablewrap" }, [el("table", {}, [el("thead", {}, [head]), body])]));
    var pct = total ? Math.round(done / total * 100) : 0;
    box.appendChild(el("p", { "class": pct === 100 ? "done" : "", text: "Family completion: " + pct + "% (" + done + " of " + total + " assessments)." }));
    return box;
  }

  /* step 5: report */
  var reportFor = "";
  function reportData(s) {
    var rows = [], cells = 0, have = 0, blind = [];
    ALL.forEach(function (t) {
      var vals = [], per = {};
      S.people.forEach(function (r) {
        var x = S.a[k(r, s)], v = x && x.v[t[0]]; per[r] = v;
        if (x && (v || stats(r, s).filled)) cells++;
        if (typeof v === "number") { vals.push(v); have++; }
        if (v === "skip") blind.push(t[1] + " (left out by " + r + ")");
      });
      var avg = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
      var spread = vals.length > 1 ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : 0;
      var others = S.people.filter(function (r) { return r !== s && typeof per[r] === "number"; }).map(function (r) { return per[r]; });
      var oAvg = others.length ? others.reduce(function (a, b) { return a + b; }, 0) / others.length : null;
      var selfGap = typeof per[s] === "number" && oAvg !== null ? per[s] - oAvg : null;
      if (!vals.length) blind.push(t[1] + " (no answers yet)");
      rows.push({ t: t, per: per, avg: avg, spread: spread, selfGap: selfGap });
    });
    var raters = S.people.filter(function (r) { return stats(r, s).filled > 0; });
    var possible = raters.length * ALL.length;
    var avgs = rows.filter(function (x) { return x.avg !== null; }).map(function (x) { return x.avg; });
    var overall = avgs.length ? avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length : null;
    return { rows: rows, raters: raters, coverage: possible ? Math.round(have / possible * 100) : 0, blind: blind, overall: overall };
  }
  function zoneOf(v) { return Math.min(5, Math.max(1, Math.round(v))); }
  function stepReport() {
    var box = el("div", { "class": "step report", id: "fh-report" }, [el("h3", { text: "5. Report" })]);
    if (!reportFor || S.people.indexOf(reportFor) < 0) reportFor = S.subject || S.people[0];
    var s = el("select", { id: "fh-rep" });
    S.people.forEach(function (p) { var o = el("option", { value: p, text: p }); if (p === reportFor) o.selected = true; s.appendChild(o); });
    s.addEventListener("change", function () { reportFor = s.value; render(); var n = $("#fh-rep"); if (n) n.focus(); });
    box.appendChild(el("div", { "class": "row" }, [el("label", { "for": "fh-rep" }, ["Show the report about", s])]));
    var d = reportData(reportFor);
    if (!d.raters.length) { box.appendChild(el("p", { text: "No one has assessed " + reportFor + " yet." })); return box; }
    box.appendChild(el("p", {}, [el("b", { text: "Overall: " }), d.overall === null ? "not enough answers yet." : "zone " + zoneOf(d.overall) + " (" + ZONES[zoneOf(d.overall) - 1].toLowerCase() + "), average " + d.overall.toFixed(1) + " across " + d.raters.length + " " + (d.raters.length === 1 ? "person" : "people") + ".", " ", el("b", { text: "Data: " }), d.coverage + "% of possible answers. The rest is a blind spot."]));
    var head = el("tr", {}, [el("th", { scope: "col", text: "Spectrum" })]);
    d.raters.forEach(function (r) { head.appendChild(el("th", { scope: "col", text: r === reportFor ? r + " (self)" : r })); });
    head.appendChild(el("th", { scope: "col", text: "Average" }));
    var body = el("tbody");
    d.rows.forEach(function (x) {
      var tr = el("tr", {}, [el("th", { scope: "row", text: x.t[1] })]);
      d.raters.forEach(function (r) { var v = x.per[r]; tr.appendChild(typeof v === "number" ? el("td", { "class": "z" + v, text: String(v) }) : el("td", { "class": "gap", text: v === "skip" ? "left out" : "–" })); });
      var a = el("td", { "class": x.avg === null ? "gap" : "z" + zoneOf(x.avg), text: x.avg === null ? "blind spot" : x.avg.toFixed(1) });
      if (x.spread >= 2) a.appendChild(el("span", { "class": "flag", text: "seen very differently" }));
      if (x.selfGap !== null && Math.abs(x.selfGap) >= 2) a.appendChild(el("span", { "class": "flag", text: x.selfGap < 0 ? "self-view kinder than others'" : "self-view harsher than others'" }));
      tr.appendChild(a); body.appendChild(tr);
    });
    box.appendChild(el("div", { "class": "tablewrap" }, [el("table", {}, [el("thead", {}, [head]), body])]));
    var strong = d.rows.filter(function (x) { return x.avg !== null && x.avg <= 2; }).map(function (x) { return x.t[1]; });
    var hard = d.rows.filter(function (x) { return x.avg !== null && x.avg >= 4; }).map(function (x) { return x.t[1]; });
    var ul = el("ul");
    ul.appendChild(el("li", { text: "Strengths: " + (strong.length ? strong.join(", ") : "none stand out yet") + "." }));
    ul.appendChild(el("li", { text: "Hardest areas: " + (hard.length ? hard.join(", ") : "none stand out yet") + "." }));
    ul.appendChild(el("li", { text: "Blind spots: " + (d.blind.length ? d.blind.join("; ") : "none") + "." }));
    box.appendChild(ul);
    box.appendChild(el("p", { "class": "small", text: "This is not a diagnosis. It shows how your family sees each other, so you can talk about it together and with a professional." }));
    var out = el("p", { "class": "small", role: "status" });
    box.appendChild(el("div", { "class": "actions" }, [
      el("button", { type: "button", "class": "btn primary", text: "Copy this report", onclick: function () { copy(reportText(reportFor, d), out); } }),
      el("button", { type: "button", "class": "btn", text: "Save as a text file", onclick: function () { download("family-report-" + reportFor.replace(/\W+/g, "-") + ".txt", reportText(reportFor, d)); } })]));
    box.appendChild(out);
    return box;
  }
  function reportText(s, d) {
    var L = ["Family mental health report about " + s, "From: elevat.ing/family-health (not medical advice; one person's belief system)", ""];
    L.push("Filled in by: " + d.raters.join(", "));
    L.push("Overall: " + (d.overall === null ? "not enough answers" : "zone " + zoneOf(d.overall) + " (" + ZONES[zoneOf(d.overall) - 1] + "), average " + d.overall.toFixed(1)));
    L.push("Data: " + d.coverage + "% of possible answers. The rest is a blind spot.", "", "Scale: 1 exceptional, 3 population average, 5 extremely deficient.", "");
    d.rows.forEach(function (x) {
      L.push(x.t[1] + ": " + d.raters.map(function (r) { var v = x.per[r]; return r + " " + (typeof v === "number" ? v : v === "skip" ? "left out" : "-"); }).join(", ") + " | average " + (x.avg === null ? "blind spot" : x.avg.toFixed(1)) + (x.spread >= 2 ? " | seen very differently" : ""));
    });
    L.push("", "Blind spots: " + (d.blind.length ? d.blind.join("; ") : "none"));
    return L.join("\n");
  }

  /* step 6: combine devices */
  function stepShare() {
    var box = el("div", { "class": "step" }, [el("h3", { text: "6. Combine answers from other devices" }),
      el("p", { "class": "small", text: "If family members fill this in on their own phones, each can copy their answers and send them to one person, who pastes them here. Nothing passes through us." })]);
    var out = el("p", { "class": "small", role: "status" });
    box.appendChild(el("div", { "class": "actions" }, [el("button", { type: "button", "class": "btn", text: "Copy all answers on this device", onclick: function () { copy("ELV-FAMILY-HEALTH-1 " + JSON.stringify({ people: S.people, a: S.a }), out); } })]));
    var ta = el("textarea", { id: "fh-paste", placeholder: "Paste answers that start with ELV-FAMILY-HEALTH-1" });
    box.appendChild(el("label", { "for": "fh-paste", style: "display:block;font-weight:700;margin-top:12px", text: "Add answers from a family member" }));
    box.appendChild(ta);
    box.appendChild(el("div", { "class": "actions" }, [
      el("button", { type: "button", "class": "btn primary", text: "Add these answers", onclick: function () {
        var m = ta.value.trim().match(/^ELV-FAMILY-HEALTH-1\s+([\s\S]+)$/);
        try {
          var d = JSON.parse(m[1]), n = 0;
          (d.people || []).forEach(function (p) { p = String(p).replace(/[\u0001<>]/g, "").slice(0, 30).trim(); if (p && S.people.indexOf(p) < 0) S.people.push(p); });
          Object.keys(d.a || {}).forEach(function (kk) {
            var pr = kk.split("\u0001"); if (pr.length !== 2 || S.people.indexOf(pr[0]) < 0 || S.people.indexOf(pr[1]) < 0) return;
            var src = d.a[kk].v || {}, dst = rec(pr[0], pr[1]);
            ALL.forEach(function (t) { var v = src[t[0]]; if (v === "skip" || (v >= 1 && v <= 5 && v === Math.round(v))) { dst.v[t[0]] = v; n++; } });
          });
          save(); render(); var o = $("#fh-report"); if (o) o.scrollIntoView();
        } catch (e) { out.textContent = "Those answers could not be read. Copy them again with the button above, and paste the whole text."; }
      } }),
      el("button", { type: "button", "class": "btn", text: "Clear everything on this device", onclick: function () { if (confirm("Delete every name and answer saved in this browser?")) { S = blank(); save(); render(); } } })]));
    box.appendChild(out);
    return box;
  }

  function copy(text, out) {
    function fb() { var t = el("textarea"); t.value = text; t.style.cssText = "position:fixed;left:-999px"; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) { } document.body.removeChild(t); out.textContent = ok ? "Copied." : "Could not copy on this device."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { out.textContent = "Copied."; }, fb); else fb();
  }
  function download(name, text) {
    var a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "text/plain" })), download: name });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* made-up example: three hypothetical people, no one real */
  function example() {
    if (S.people.length && !confirm("Replace what is saved in this browser with a made-up example family?")) return;
    var P = ["Parent 1", "Parent 2", "Grown child"];
    var base = { "Parent 1": [2, 2, 3, 4, 4, 4, 5, 3, 4, 5, 4, 4, 4, 4, 3, 5, 4, 3, 3, 4], "Parent 2": [2, 3, 2, 3, 2, 3, 4, 3, 4, 4, 3, 2, 2, 2, 2, 4, 3, 3, 2, 2], "Grown child": [2, 2, 2, 3, 2, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 3, 3, 2, 3, 2] };
    S = blank(); S.people = P.slice();
    P.forEach(function (r, ri) {
      P.forEach(function (s, si) {
        var x = rec(r, s);
        ALL.forEach(function (t, i) {
          var v = base[s][i];
          if (r === s && s === "Parent 1") v = Math.max(1, v - 2);
          else if ((ri + si + i) % 7 === 0) v = Math.min(5, v + 1);
          x.v[t[0]] = v;
        });
        if (r === "Grown child" && s !== "Parent 1") { x.v.anger = "skip"; }
      });
    });
    S.rater = "Grown child"; S.subject = "Parent 1"; reportFor = "Parent 1";
    save(); render(); var o = $("#fh-report"); if (o) o.scrollIntoView();
  }

  render();
})();
