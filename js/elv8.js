/* elevat.ing page script: thumbs and voice on cards, the site list, the first-visit mission statement, and the vision player.
   Sends go through the shared bottom bar's send() (window.HMRDock.send) when it is ready. Nothing is tracked. */
(function () {
  "use strict";
  var doc = document;
  function el(tag, attrs, kids) {
    var e = doc.createElement(tag), k;
    for (k in (attrs || {})) {
      if (k === "text") e.textContent = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return e;
  }
  function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function ext(href, text, cls) { return el("a", { href: href, target: "_blank", rel: "noopener", "class": cls || null, text: text }); }
  function dock() { return window.HMRDock && window.HMRDock.send ? window.HMRDock : null; }
  function send(p) {
    var d = dock();
    if (!d) return Promise.resolve({ ok: false, via: "none" });
    try { return d.send(p); } catch (e) { return Promise.resolve({ ok: false, via: "none" }); }
  }

  /* ---------- mic: live text as you talk ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function micFor(field, say) {
    if (!SR) return null;
    var on = false, rec = null, base = "";
    var b = el("button", { type: "button", "class": "mic", "aria-pressed": "false", "aria-label": "Start recording", text: "🎙" });
    b.addEventListener("click", function () {
      if (on) { try { rec.stop(); } catch (e) {} return; }
      try {
        rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = doc.documentElement.lang || "en-US";
        base = field.value ? field.value.replace(/\s*$/, " ") : "";
        rec.onresult = function (e) { var t = "", i; for (i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; field.value = base + t; };
        rec.onend = function () { on = false; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Start recording"); b.classList.remove("rec"); say("Paused. Edit the words if you like, then send."); };
        rec.onerror = function (e) { say(e && e.error === "not-allowed" ? "Your browser blocked the microphone. Allow it for this site, or type instead." : "The mic stopped. You can type instead."); };
        rec.start(); on = true; b.setAttribute("aria-pressed", "true"); b.setAttribute("aria-label", "Stop recording"); b.classList.add("rec");
        say("Recording. You will see your words appear as you talk. If no words appear, the recording has not started.");
      } catch (e) { say("The mic could not start here. You can type instead."); }
    });
    b.stop = function () { if (on) try { rec.stop(); } catch (e) {} };
    return b;
  }

  /* ---------- voice box ---------- */
  var vbN = 0;
  function voiceBox(label, prompt) {
    var id = "vb" + (++vbN);
    var box = el("div", { "class": "vb", id: id, role: "group", "aria-label": "Your voice on " + label });
    var ta = el("textarea", { id: id + "-t", rows: "4", maxlength: "4000", placeholder: prompt || "What do you like? What don't you like? What could be better? Press the mic and talk, or type." });
    var out = el("p", { "class": "out", role: "status", "aria-live": "polite" });
    function say(t) { out.textContent = t; }
    var mic = micFor(ta, say);
    box.appendChild(el("label", { "for": id + "-t", text: "Your voice on " + label.replace(/^[^:]+: /, "") }));
    box.appendChild(el("div", { "class": "row" }, [ta, mic]));
    var em = el("input", { type: "email", id: id + "-e", autocomplete: "email", placeholder: "Only if you want a reply" });
    box.appendChild(el("label", { "for": id + "-e", text: "Email (optional)" }));
    box.appendChild(em);
    var sb = el("button", { type: "button", "class": "btn primary small", text: "Send" });
    sb.addEventListener("click", function () {
      var msg = ta.value.trim();
      if (!msg) { say("Add a few words first."); ta.focus(); return; }
      if (mic) mic.stop();
      if (!dock()) { say("Sending isn't ready yet. Use the mic at the bottom of the page, and mention " + label + "."); return; }
      sb.disabled = true; say("Sending...");
      send({ kind: "feedback", subject: "elevat.ing, voice on " + label, message: label + ":\n\n" + msg, email: em.value.trim() || undefined, details: { site: "elevat.ing", about: label } })
        .then(function (r) { sb.disabled = false; if (r && r.ok) { ta.value = ""; say("Sent. Thank you. Every message is read."); } else say("Your email app should have opened with your message. Your words are still here."); },
          function () { sb.disabled = false; say("That didn't send. Your words are still here; try again."); });
    });
    box.appendChild(el("p", { style: "margin:.5rem 0 0" }, [sb]));
    box.appendChild(out);
    return box;
  }

  /* ---------- thumbs ---------- */
  function thumbs(key, label, holder) {
    var wrap = el("span", { "class": "thumbs", role: "group", "aria-label": "Your reaction to " + label });
    var was = get("elv8.th." + key);
    [["up", "👍", "Thumbs up"], ["down", "👎", "Thumbs down"]].forEach(function (t) {
      var b = el("button", { type: "button", "class": "thumb", "aria-pressed": String(was === t[0]), "aria-label": t[2] + " for " + label, text: t[1] });
      b.addEventListener("click", function () {
        var now = get("elv8.th." + key);
        if (now === t[0]) return;
        put("elv8.th." + key, t[0]);
        [].forEach.call(wrap.querySelectorAll(".thumb"), function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        send({ kind: "reaction", subject: "elevat.ing " + t[2].toLowerCase() + ": " + label, message: t[2] + " on " + label + " (elevat.ing)", details: { site: "elevat.ing", about: label, thumb: t[0] }, noMailto: true });
        if (t[0] === "down" && holder && holder.openVoice) holder.openVoice("Sorry to hear that. What could be better?");
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function reactRow(key, label, host) {
    var row = el("div", { "class": "foot" });
    var box = null;
    var vo = el("button", { type: "button", "class": "voice-open", "aria-expanded": "false", text: "Add your voice" });
    var api = {
      openVoice: function (prompt) {
        if (!box) { box = voiceBox(label, prompt); host.appendChild(box); vo.setAttribute("aria-controls", box.id); }
        box.hidden = false; vo.setAttribute("aria-expanded", "true");
        var t = box.querySelector("textarea"); if (t) t.focus();
      }
    };
    vo.addEventListener("click", function () {
      if (box && !box.hidden) { box.hidden = true; vo.setAttribute("aria-expanded", "false"); return; }
      api.openVoice();
    });
    row.appendChild(thumbs(key, label, api));
    row.appendChild(vo);
    return row;
  }
  [].forEach.call(doc.querySelectorAll("[data-react]"), function (c) {
    var key = c.getAttribute("data-react"), label = c.getAttribute("data-label") || key;
    var row = reactRow(key, label, c);
    var old = c.querySelector(":scope > .foot");
    if (old && !old.children.length) c.replaceChild(row, old); else c.appendChild(row);
  });

  /* ---------- every site, and the plan for each ---------- */
  var list = doc.getElementById("slist"), finder = doc.getElementById("finder");
  if (list && finder) {
    var STAGE = { family: "Main site", starter: "Starter page", plan: "Plan only" };
    var all = [], st = { q: "", cat: "", stage: "", sort: "cool" }, shown = 40;
    var more = doc.getElementById("showmore"), sum = doc.getElementById("sum");
    var q = el("input", { type: "search", id: "sq", placeholder: "Search sites and plans", "aria-label": "Search sites and plans", autocomplete: "off" });
    var go = el("button", { type: "button", "class": "btn primary", text: "Search" });
    var clr = el("button", { type: "button", "class": "btn", text: "Clear" });
    finder.appendChild(el("div", { "class": "q" }, [q, go, clr]));
    function pick(id, text, key, opts) {
      var s = el("select", { id: id });
      opts.forEach(function (o) { s.appendChild(el("option", { value: o[0], text: o[1] })); });
      s.addEventListener("change", function () { st[key] = s.value; shown = 40; render(); });
      finder.appendChild(el("label", { "for": id }, [el("span", { text: text }), s]));
      return s;
    }
    function clean(v) { return v.toLowerCase().replace(/[^a-z0-9.\s-]+/g, " ").replace(/\.(\s|$)/g, " ").replace(/\s+/g, " ").trim(); }
    function readQ() { st.q = clean(q.value); shown = 40; render(); }
    go.addEventListener("click", readQ);
    q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); readQ(); } });
    q.addEventListener("search", readQ);
    var qt = 0; q.addEventListener("input", function () { clearTimeout(qt); qt = setTimeout(readQ, 250); });
    var sels = [];
    clr.addEventListener("click", function () { q.value = ""; st = { q: "", cat: "", stage: "", sort: "cool" }; sels.forEach(function (s) { s.selectedIndex = 0; }); shown = 40; render(); q.focus(); });
    function pass(r) {
      if (st.cat && r.c !== st.cat) return false;
      if (st.stage && r.m !== st.stage) return false;
      if (st.q) {
        var hay = (r.h + " " + r.p + " " + r.c).toLowerCase(), flat = hay.replace(/[^a-z0-9]+/g, "");
        var whole = st.q.replace(/[^a-z0-9]+/g, "");
        var words = st.q.split(" ").filter(function (w) { return w && !/^(a|an|the|and|or|of|to|on|in|dot|com|for)$/.test(w); });
        if (!((whole && flat.indexOf(whole) >= 0) || (words.length && words.every(function (w) { return hay.indexOf(w) >= 0 || flat.indexOf(w.replace(/[^a-z0-9]+/g, "")) >= 0; })))) return false;
      }
      return true;
    }
    function row(r) {
      var li = el("li");
      var name = el("span", { "class": "name" }, [r.u ? ext(r.u, r.h) : r.h]);
      li.appendChild(name);
      li.appendChild(el("span", { "class": "stage " + r.m, text: STAGE[r.m] || r.m }));
      li.appendChild(el("span", { "class": "plan" }, [el("b", { text: "The plan: " }), r.p + " ", el("span", { "class": "cat", text: r.c })]));
      var acts = reactRow("site-" + r.h, "site: " + r.h, li);
      acts.className = "acts";
      li.appendChild(acts);
      return li;
    }
    function render() {
      var rows = all.filter(pass);
      if (st.sort === "az") rows = rows.slice().sort(function (a, b) { return a.h < b.h ? -1 : 1; });
      list.textContent = "";
      rows.slice(0, shown).forEach(function (r) { list.appendChild(row(r)); });
      if (!rows.length) list.appendChild(el("li", { text: st.q ? "No sites match “" + st.q + "”. Try one word, like grandma, dogs or ai, or press Clear." : "No sites match. Try fewer filters." }));
      more.hidden = rows.length <= shown;
      more.textContent = "Show more (" + (rows.length - shown) + " left)";
      var live = all.filter(function (r) { return r.u; }).length;
      sum.textContent = "Showing " + Math.min(shown, rows.length) + " of " + rows.length + (rows.length === all.length ? "" : " matching") + " sites. We have " + all.length + " in all; " + live + " have a page you can open now.";
    }
    more.addEventListener("click", function () { shown += 60; render(); });
    var x = new XMLHttpRequest();
    x.open("GET", "data/sites.json?v=20261127");
    x.onload = function () {
      var d; try { d = JSON.parse(x.responseText); } catch (e) { sum.textContent = "The list could not load. Refresh to try again."; return; }
      all = (d.sites || []).map(function (r, i) { r.n = i; return r; });
      var cc = {}; all.forEach(function (r) { cc[r.c] = (cc[r.c] || 0) + 1; });
      var cats = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a] || (a < b ? -1 : 1); });
      sels.push(pick("scat", "Category", "cat", [["", "All categories (" + all.length + ")"]].concat(cats.map(function (k) { return [k, k + " (" + cc[k] + ")"]; }))));
      var mc = {}; all.forEach(function (r) { mc[r.m] = (mc[r.m] || 0) + 1; });
      sels.push(pick("sstage", "Where it stands", "stage", [["", "Any stage"]].concat(["family", "starter", "plan"].filter(function (k) { return mc[k]; }).map(function (k) { return [k, STAGE[k] + " (" + mc[k] + ")"]; }))));
      sels.push(pick("ssort", "Order", "sort", [["cool", "Coolest first"], ["az", "A to Z"]]));
      render();
    };
    x.onerror = function () { sum.textContent = "The list could not load. Refresh to try again."; };
    x.send();
  }

  /* ---------- first visit: a little about you (skippable), then the mission statement ---------- */
  var FV = "elv8.fv.v1";
  function fvState() { try { return JSON.parse(get(FV) || "{}") || {}; } catch (e) { return {}; } }
  function fvSave(s) { put(FV, JSON.stringify(s)); }
  function overlay(build) {
    var last = doc.activeElement;
    var o = el("div", { "class": "fv", role: "dialog", "aria-modal": "true", "aria-labelledby": "fv-h" });
    var box = el("div", { "class": "fv-box" });
    o.appendChild(box);
    function close() { if (o.parentNode) o.parentNode.removeChild(o); doc.removeEventListener("keydown", onKey, true); try { if (last && last.focus) last.focus(); } catch (e) {} }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); if (o.onEsc) o.onEsc(); else close(); } }
    doc.addEventListener("keydown", onKey, true);
    build(box, close, o);
    doc.body.appendChild(o);
    var f = box.querySelector("input,textarea,button"); if (f) f.focus();
    return o;
  }
  function missionStep(box, close, o) {
    box.textContent = "";
    var m = el("div", { "class": "mission" });
    m.appendChild(el("h2", { id: "fv-h", text: "Our mission" }));
    m.appendChild(el("p", { "class": "hook", text: "If you don't think one person can change the world, that's our mission." }));
    m.appendChild(el("p", { text: "Everything in our system of elevating websites is the work of one person working with AI. We are not saying this to brag. We are saying it to show you the potential you have. If one person can solve this many problems, just imagine what you can do, and what happens when we all band together on the same vision." }));
    m.appendChild(el("p", { text: "Our goal is to elevate humanity, and to show everybody that a small team can make a big difference in the pursuit of truth and harmony." }));
    m.appendChild(el("p", { text: "The very first page you are going to see is our plans to do that for everybody, for free, forever. Then you will see our flagship free product, which helps anybody who has never used AI use it for the first time, for free." }));
    box.appendChild(m);
    var later = el("button", { type: "button", "class": "btn primary", text: "Thanks. I want to review this again later" });
    var never = el("button", { type: "button", "class": "btn", text: "Never show this again" });
    later.addEventListener("click", function () { var s = fvState(); s.mission = "later"; fvSave(s); close(); });
    never.addEventListener("click", function () { var s = fvState(); s.mission = "never"; fvSave(s); close(); });
    o.onEsc = function () { var s = fvState(); s.mission = s.mission || "later"; fvSave(s); close(); };
    box.appendChild(el("div", { "class": "acts" }, [later, never]));
    later.focus();
  }
  function infoStep(box, close, o) {
    box.appendChild(el("h2", { id: "fv-h", text: "Welcome. Happy Thanksgiving 2026." }));
    box.appendChild(el("p", { text: "Tell us a little about yourself, if you like. Every box is optional. Press the mic and talk, or type." }));
    var vb = el("div", { "class": "vb" });
    var out = el("p", { "class": "out", role: "status", "aria-live": "polite" });
    function say(t) { out.textContent = t; }
    var n = el("input", { type: "text", id: "fv-n", autocomplete: "nickname", maxlength: "80" });
    var w = el("textarea", { id: "fv-w", rows: "3", maxlength: "2000", placeholder: "How do you use AI today, if at all? What would you love help with?" });
    var e = el("input", { type: "email", id: "fv-e", autocomplete: "email", placeholder: "Only if you want a reply" });
    vb.appendChild(el("label", { "for": "fv-n", text: "What should we call you?" }));
    vb.appendChild(el("div", { "class": "row" }, [n, micFor(n, say)]));
    vb.appendChild(el("label", { "for": "fv-w", text: "What brings you here?" }));
    vb.appendChild(el("div", { "class": "row" }, [w, micFor(w, say)]));
    vb.appendChild(el("label", { "for": "fv-e", text: "Email (optional)" }));
    vb.appendChild(e);
    vb.appendChild(out);
    box.appendChild(vb);
    var skip = el("button", { type: "button", "class": "btn", text: "Skip entering my information" });
    var next = el("button", { type: "button", "class": "btn primary", text: "Next" });
    function done() { var s = fvState(); s.info = 1; fvSave(s); missionStep(box, close, o); }
    skip.addEventListener("click", done);
    next.addEventListener("click", function () {
      var msg = [n.value.trim() && "Call me: " + n.value.trim(), w.value.trim() && "What brings me here: " + w.value.trim()].filter(Boolean).join("\n");
      if (msg || e.value.trim()) send({ kind: "first visit", subject: "elevat.ing first visit", message: msg || "(no words, email only)", email: e.value.trim() || undefined, details: { site: "elevat.ing", step: "first visit" }, noMailto: true });
      done();
    });
    o.onEsc = done;
    box.appendChild(el("div", { "class": "acts" }, [skip, next]));
  }
  function firstVisit(force) {
    var s = fvState();
    if (force) { overlay(missionStep); return; }
    if (s.mission === "never") return;
    if (!s.info) overlay(infoStep); else overlay(missionStep);
  }
  [].forEach.call(doc.querySelectorAll("[data-fv-open]"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); firstVisit(true); }); });
  if (doc.getElementById("missions") && !/[?&]nofv\b/.test(location.search)) setTimeout(function () { firstVisit(false); }, 600);

  /* ---------- the vision, as a short animation ---------- */
  var pl = doc.getElementById("player");
  if (pl) {
    var NS = "http://www.w3.org/2000/svg";
    function s(tag, a) { var e = doc.createElementNS(NS, tag), k; for (k in a) e.setAttribute(k, a[k]); return e; }
    var stage = el("div", { "class": "stage-v" });
    var svg = s("svg", { viewBox: "0 0 160 90", "aria-hidden": "true", preserveAspectRatio: "xMidYMid meet" });
    var cap = el("div", { "class": "cap", "aria-live": "polite" });
    stage.appendChild(svg); stage.appendChild(cap);
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var N = 44, dots = [], links = s("g", {}), hub = s("g", { style: "opacity:0;transition:opacity 1s" });
    svg.appendChild(links);
    var ring = s("circle", { cx: 80, cy: 45, r: 14, fill: "#ffcc33", opacity: ".95" });
    var glow = s("circle", { cx: 80, cy: 45, r: 20, fill: "none", stroke: "#ffcc33", "stroke-width": ".6", opacity: ".5" });
    var ht = s("text", { x: 80, y: 46.6, "text-anchor": "middle", "font-size": "4.4", "font-weight": "800", fill: "#1c1a2b" }); ht.textContent = "elevat.ing";
    hub.appendChild(glow); hub.appendChild(ring); hub.appendChild(ht); svg.appendChild(hub);
    for (var i = 0; i < N; i++) {
      var d = { x: 8 + rnd() * 144, y: 8 + rnd() * 70, ad: rnd() < 0.45 };
      var a = (i / N) * Math.PI * 2;
      d.hx = 80 + Math.cos(a) * (24 + (i % 3) * 5); d.hy = 45 + Math.sin(a) * (24 + (i % 3) * 5) * 0.85;
      d.c = s("circle", { r: 2.2, cx: 0, cy: 0, "class": "dot", fill: "#8a85a8", style: "transform:translate(" + d.x + "px," + d.y + "px)" });
      svg.appendChild(d.c); dots.push(d);
    }
    var people = s("g", { style: "opacity:0;transition:opacity 1s" });
    for (var j = 0; j < 8; j++) {
      var ang = j / 8 * Math.PI * 2, px = 80 + Math.cos(ang) * 62, py = 45 + Math.sin(ang) * 38;
      people.appendChild(s("line", { x1: px, y1: py, x2: 80 + Math.cos(ang) * 16, y2: 45 + Math.sin(ang) * 14, stroke: "#7a5cf0", "stroke-width": ".5", "stroke-dasharray": "1.5 1.5" }));
      var pe = s("text", { x: px, y: py + 1.6, "text-anchor": "middle", "font-size": "5" }); pe.textContent = j % 2 ? "🎙" : "🙂";
      people.appendChild(pe);
    }
    svg.appendChild(people);
    var SC = [
      ["Today, the best of the internet is scattered across millions of sites.", function () { dots.forEach(function (d) { d.c.setAttribute("fill", "#8a85a8"); d.c.style.opacity = 1; d.c.style.transform = "translate(" + d.x + "px," + d.y + "px)"; }); hub.style.opacity = 0; people.style.opacity = 0; }],
      ["Much of it comes with ads, paywalls and noise.", function () { dots.forEach(function (d) { if (d.ad) d.c.setAttribute("fill", "#e53935"); }); }],
      ["We take all of the best content, filtered by our values, and bring it together.", function () { dots.forEach(function (d) { if (d.ad) { d.c.style.opacity = 0.12; } else { d.c.setAttribute("fill", "#43a047"); d.c.style.transform = "translate(" + d.hx + "px," + d.hy + "px)"; } }); }],
      ["One always free, ad-free hub of human innovation.", function () { hub.style.opacity = 1; dots.forEach(function (d) { if (!d.ad) d.c.setAttribute("fill", "#ffcc33"); }); }],
      ["You talk back with the mic, and every site gets better. A new site every week.", function () { people.style.opacity = 1; }],
      ["By 2036, a tamed internet. Humanity elevates.", function () { dots.forEach(function (d) { if (d.ad) { d.c.style.opacity = 0; } }); }]
    ];
    var big = el("button", { type: "button", "class": "playbig", "aria-label": "Play the vision", text: "▶" });
    stage.appendChild(big);
    var ctl = el("div", { "class": "pctl" });
    var pb = el("button", { type: "button", text: "Play" });
    var bar = el("div", { "class": "bar", "aria-hidden": "true" }, [el("i")]);
    ctl.appendChild(pb); ctl.appendChild(bar);
    pl.appendChild(stage); pl.appendChild(ctl);
    var k = -1, timer = 0, playing = false;
    function show(n) { k = n; SC[n][1](); cap.textContent = SC[n][0]; bar.firstChild.style.width = ((n + 1) / SC.length * 100) + "%"; }
    function step() { if (k >= SC.length - 1) { stop(true); return; } show(k + 1); timer = setTimeout(step, 3600); }
    function play() { if (k >= SC.length - 1 || k < 0) { k = -1; SC[0][1](); } big.hidden = true; playing = true; pb.textContent = "Pause"; step(); }
    function stop(end) { clearTimeout(timer); playing = false; pb.textContent = end ? "Replay" : "Play"; if (end) big.hidden = true; }
    big.addEventListener("click", play);
    pb.addEventListener("click", function () { if (playing) stop(false); else play(); });
    cap.textContent = "Our vision for the internet. Press play.";
  }
})();
