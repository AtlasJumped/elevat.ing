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
  var activeMic = null;
  var MIC_TIP = "Press the microphone button and talk. You'll see the text in there. When you're done talking, you don't need to press anything. Just press the next microphone and start talking. If you want to skip a section, just skip to the next microphone.";
  function micFor(field, say) {
    if (!SR) return null;
    var on = false, rec = null, base = "", after = null;
    var b = el("button", { type: "button", "class": "mic", "aria-pressed": "false", "aria-label": "Start recording", title: "Talk instead of typing" });
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
    function ended() {
      if (activeMic === b) activeMic = null; on = false; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Start recording"); b.classList.remove("rec");
      var f = after; after = null; if (f) f(); else say("Paused. Edit the words if you like.");
    }
    function start() {
      activeMic = b;
      try {
        rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = doc.documentElement.lang || "en-US";
        base = field.value ? field.value.replace(/\s*$/, " ") : "";
        rec.onresult = function (e) { var t = "", i; for (i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; field.value = base + t; };
        rec.onend = ended;
        rec.onerror = function (e) { if (e && e.error === "aborted") return; say(e && e.error === "not-allowed" ? "Your browser blocked the microphone. Allow it for this site, or type instead." : "The mic stopped. You can type instead."); };
        rec.start(); on = true; b.setAttribute("aria-pressed", "true"); b.setAttribute("aria-label", "Stop recording"); b.classList.add("rec");
        say("Recording. Your words appear in the box as you talk.");
      } catch (e) { on = false; if (activeMic === b) activeMic = null; say("The mic could not start here. You can type instead."); }
    }
    b.addEventListener("click", function () {
      if (on) { try { rec.stop(); } catch (e) {} return; }
      /* one mic at a time: the mic that was on is switched off first, and this one starts the moment it has stopped */
      if (activeMic && activeMic !== b) { var prev = activeMic, went = false, go = function () { if (went) return; went = true; start(); }; prev.stop(go); setTimeout(go, 700); return; }
      start();
    });
    b.stop = function (then) { if (on) { after = then || null; try { rec.abort ? rec.abort() : rec.stop(); } catch (e) { ended(); } } else if (then) then(); };
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
    if (SR) box.appendChild(el("p", { "class": "tip", text: "Press the microphone button and talk. You'll see the text in the box. Paste a link or text too, if you like." }));
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
    var STAGE = { family: "Main site", done: "Completed", starter: "Starter page", plan: "Plan only" };
    var all = [], st = { q: "", cat: "", stage: "", sort: "cool" }, shown = 40;
    var more = doc.getElementById("showmore"), sum = doc.getElementById("sum");
    /* our own pages and cards, so the search covers everything on elevat.ing, not just the site list */
    var PAGES = [
      { t: "Ending world suffering", u: "end-suffering/", x: "Our plan to end world suffering: end starvation, poverty and homelessness. Cut waste, match what people no longer need to the places that need it, and move food fast. Waste is lost work." },
      { t: "How we keep it secure", u: "security/", x: "Our vision for security: hardware switches, a chain of locked boxes, AI security agents that get stronger every month, logging in, and why nothing here asks for money." },
      { t: "How communities are built", u: "communities/", x: "A map of the world where people say where they want to live, what they value, and what they would contribute. Start with a shared mission. Describe your ideal community." }
    ];
    [].forEach.call(doc.querySelectorAll("main [data-react], .afraid[data-react]"), function (c, i) {
      var h = c.querySelector("h2, h3, .host, blockquote"); if (!h) return;
      if (!c.id) c.id = "c-" + (c.getAttribute("data-react") || i);
      var body = [].map.call(c.querySelectorAll("p, li"), function (n) { return n.textContent; }).join(" ");
      PAGES.push({ t: h.textContent.trim(), u: "#" + c.id, x: body.replace(/\s+/g, " ").trim(), card: c });
    });
    var phits = el("div", { "class": "phits", "aria-live": "polite" });
    sum.parentNode.insertBefore(phits, sum);
    function pageHits() {
      phits.textContent = "";
      if (!st.q) return;
      var words = st.q.split(" ").filter(function (w) { return w.length > 1 && !/^(an|the|and|or|of|to|on|in|dot|com|for)$/.test(w); });
      if (!words.length) return;
      var hits = PAGES.filter(function (pg) { var hay = (pg.t + " " + pg.x).toLowerCase(); return words.every(function (w) { return hay.indexOf(w) >= 0; }); });
      if (!hits.length) return;
      phits.appendChild(el("h3", { "class": "phits-h", text: "On elevat.ing (" + hits.length + ")" }));
      var ul = el("ul");
      hits.slice(0, 12).forEach(function (pg) {
        var hay = pg.x, at = hay.toLowerCase().indexOf(words[0]), from = Math.max(0, at - 60);
        var snip = (from ? "..." : "") + hay.slice(from, from + 170) + (from + 170 < hay.length ? "..." : "");
        var a = el("a", { href: pg.u, text: pg.t });
        if (pg.card) a.addEventListener("click", function () { var d = pg.card.querySelector("details"); if (d) d.open = true; });
        ul.appendChild(el("li", {}, [a, el("span", { "class": "snip", text: snip })]));
      });
      phits.appendChild(ul);
    }
    /* can't find it? tell us, paste a link or text */
    var missHost = el("div", { "class": "miss" });
    var missBtn = el("button", { type: "button", "class": "voice-open", "aria-expanded": "false", text: "Can't find what you're looking for? Tell us" });
    var missBox = null;
    missBtn.addEventListener("click", function () {
      if (missBox && !missBox.hidden) { missBox.hidden = true; missBtn.setAttribute("aria-expanded", "false"); return; }
      if (!missBox) { missBox = voiceBox("search: something missing", "What were you looking for? Paste links or text, or press the mic and talk."); missHost.appendChild(missBox); missBtn.setAttribute("aria-controls", missBox.id); }
      if (st.q && !missBox.querySelector("textarea").value) missBox.querySelector("textarea").value = "I searched for: " + q.value.trim() + "\n";
      missBox.hidden = false; missBtn.setAttribute("aria-expanded", "true"); missBox.querySelector("textarea").focus();
    });
    missHost.insertBefore(missBtn, missHost.firstChild);
    more.parentNode.parentNode.insertBefore(missHost, more.parentNode.nextSibling);
    var q = el("input", { type: "search", id: "sq", placeholder: "Search everything on elevat.ing", "aria-label": "Search everything on elevat.ing", autocomplete: "off" });
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
      function endOf(h) { return h.slice(h.lastIndexOf(".")); }
      if (st.sort === "end") rows = rows.slice().sort(function (a, b) { var x = endOf(a.h), y = endOf(b.h); return x < y ? -1 : x > y ? 1 : a.n - b.n; });
      if (st.sort === "cat") rows = rows.slice().sort(function (a, b) { return a.c < b.c ? -1 : a.c > b.c ? 1 : a.n - b.n; });
      pageHits();
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
    x.open("GET", "data/sites.json?v=20261127r2");
    x.onload = function () {
      var d; try { d = JSON.parse(x.responseText); } catch (e) { sum.textContent = "The list could not load. Refresh to try again."; return; }
      all = (d.sites || []).map(function (r, i) { r.n = i; return r; });
      var cc = {}; all.forEach(function (r) { cc[r.c] = (cc[r.c] || 0) + 1; });
      var cats = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a] || (a < b ? -1 : 1); });
      sels.push(pick("scat", "Category", "cat", [["", "All categories (" + all.length + ")"]].concat(cats.map(function (k) { return [k, k + " (" + cc[k] + ")"]; }))));
      var mc = {}; all.forEach(function (r) { mc[r.m] = (mc[r.m] || 0) + 1; });
      sels.push(pick("sstage", "Where it stands", "stage", [["", "Any stage"]].concat(["family", "done", "starter", "plan"].filter(function (k) { return mc[k]; }).map(function (k) { return [k, STAGE[k] + " (" + mc[k] + ")"]; }))));
      sels.push(pick("ssort", "Order", "sort", [["cool", "Coolest first"], ["az", "A to Z"], ["end", "By domain ending"], ["cat", "By category"]]));
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
    m.appendChild(el("p", { text: "Everything in our system of elevating websites is the work of a very, very small team working with AI. We are not saying this to brag. We are saying it to show you the potential you have. If a very, very small team can solve this many problems, just imagine what you can do, and what happens when we all band together on the same vision." }));
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
    box.appendChild(el("h2", { id: "fv-h", text: "Welcome." }));
    box.appendChild(el("p", { text: SR ? "Every box is optional. Press the mic and talk or type." : "Every box is optional. Type in any box you like." }));
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
    vb.appendChild(el("div", { "class": "row" }, [e, micFor(e, say)]));
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
    var KIND = ["ad", "pay", "login", "dup"];
    for (var i = 0; i < N; i++) {
      var r0 = rnd(), d = { x: 8 + rnd() * 144, y: 10 + rnd() * 62, kind: r0 < 0.18 ? "ad" : r0 < 0.32 ? "pay" : r0 < 0.47 ? "login" : r0 < 0.58 ? "dup" : "good" };
      var a = (i / N) * Math.PI * 2;
      d.hx = 80 + Math.cos(a) * (24 + (i % 3) * 5); d.hy = 45 + Math.sin(a) * (24 + (i % 3) * 5) * 0.85;
      d.g = s("g", { "class": "dot", style: "transform:translate(" + d.x + "px," + d.y + "px)" });
      d.c = s("circle", { r: 2.2, cx: 0, cy: 0, fill: "#8a85a8" });
      d.t = s("text", { x: 0, y: -3.2, "text-anchor": "middle", "font-size": "3.4", fill: "#fff", style: "opacity:0" });
      d.t.textContent = { ad: "AD", pay: "$", login: "🔒", dup: "×2", good: "" }[d.kind];
      d.g.appendChild(d.c); d.g.appendChild(d.t);
      svg.appendChild(d.g); dots.push(d);
    }
    function tag(kinds, on) { dots.forEach(function (d) { if (kinds.indexOf(d.kind) >= 0) { d.t.style.opacity = on ? 1 : 0; if (on && d.kind === "ad") d.c.setAttribute("fill", "#e53935"); if (on && d.kind === "pay") d.c.setAttribute("fill", "#fb8c00"); } }); }
    var people = s("g", { style: "opacity:0;transition:opacity 1s" });
    for (var j = 0; j < 8; j++) {
      var ang = j / 8 * Math.PI * 2, px = 80 + Math.cos(ang) * 62, py = 45 + Math.sin(ang) * 38;
      people.appendChild(s("line", { x1: px, y1: py, x2: 80 + Math.cos(ang) * 16, y2: 45 + Math.sin(ang) * 14, stroke: "#7a5cf0", "stroke-width": ".5", "stroke-dasharray": "1.5 1.5" }));
      var pe = s("text", { x: px, y: py + 1.6, "text-anchor": "middle", "font-size": "5" }); pe.textContent = ["🎙", "🔗", "🙂", "📝"][j % 4];
      people.appendChild(pe);
    }
    svg.appendChild(people);
    var search = s("g", { style: "opacity:0;transition:opacity 1s" });
    search.appendChild(s("rect", { x: 46, y: 4, width: 68, height: 9, rx: 4.5, fill: "#ffffff", stroke: "#ffcc33", "stroke-width": ".6" }));
    var stx = s("text", { x: 51, y: 10, "font-size": "4", fill: "#4a4760" }); stx.textContent = "🔍 Search only our content";
    search.appendChild(stx); svg.appendChild(search);
    var filt = s("g", { style: "opacity:0;transition:opacity 1s" });
    filt.appendChild(s("circle", { cx: 80, cy: 45, r: 36, fill: "none", stroke: "#7a5cf0", "stroke-width": "1", "stroke-dasharray": "3 2" }));
    [["values", 80, 7.5], ["math", 38, 76], ["science", 122, 76]].forEach(function (f) { var t = s("text", { x: f[1], y: f[2], "text-anchor": "middle", "font-size": "4.2", "font-weight": "800", fill: "#c2b2ff" }); t.textContent = f[0]; filt.appendChild(t); });
    svg.appendChild(filt);
    var SC = [
      ["Today, the internet is a bunch of websites: blogs, people sharing free things, and many sites all doing the same things.", function () { dots.forEach(function (d) { d.c.setAttribute("fill", "#8a85a8"); d.t.style.opacity = 0; d.g.style.opacity = 1; d.g.style.transform = "translate(" + d.x + "px," + d.y + "px)"; }); hub.style.opacity = 0; people.style.opacity = 0; search.style.opacity = 0; filt.style.opacity = 0; }],
      ["Different places to log into, and different sites to navigate to, that are all doing the same things.", function () { tag(["login", "dup"], true); }],
      ["Some sites still make you pay for what is offered free somewhere else, and many come with ads.", function () { tag(["pay", "ad"], true); }],
      ["That model helped elevate humanity. To keep elevating, we need to upgrade our internet.", function () { }],
      ["Our AI gathers all the best content and filters it into one place.", function () { dots.forEach(function (d) { d.t.style.opacity = 0; if (d.kind !== "good") { d.g.style.opacity = 0.1; } else { d.c.setAttribute("fill", "#43a047"); d.g.style.transform = "translate(" + d.hx + "px," + d.hy + "px)"; } }); }],
      ["An internal elevating search bar searches only our own content, not the outside internet.", function () { search.style.opacity = 1; }],
      ["On any page, press the mic: tell us what you like, fact-check us with sources, or paste links and text for anything missing.", function () { people.style.opacity = 1; }],
      ["Our AI agents put every submission through a filter with a system of values, math, and science, and build it into the sites.", function () { filt.style.opacity = 1; }],
      ["One hub of human innovation. A new site every week.", function () { filt.style.opacity = 0; hub.style.opacity = 1; dots.forEach(function (d) { if (d.kind === "good") d.c.setAttribute("fill", "#ffcc33"); }); }],
      ["By 2036, a tamed internet. Humanity elevates.", function () { dots.forEach(function (d) { if (d.kind !== "good") d.g.style.opacity = 0; }); }]
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
    /* step by step: nothing plays by itself, so there is time to read. "Next step" moves on. */
    function label() { pb.textContent = k < 0 ? "Start" : k >= SC.length - 1 ? "Start over" : "Next step (" + (k + 2) + " of " + SC.length + ")"; }
    function next() { big.hidden = true; if (k >= SC.length - 1) { k = -1; SC[0][1](); } show(k + 1); label(); }
    big.addEventListener("click", next);
    pb.addEventListener("click", next);
    cap.textContent = "Our vision for the internet, one step at a time. Press Start.";
    label();
  }
  /* ---------- human trials dialog (mental and physical health cards) ---------- */
  var tm = doc.getElementById("trials");
  if (tm) {
    var tLast = null;
    function tOpen(e) { tLast = e && e.currentTarget; tm.hidden = false; var c = tm.querySelector("[data-close]"); if (c) c.focus(); }
    function tClose() { tm.hidden = true; if (tLast && tLast.focus) tLast.focus(); }
    [].forEach.call(doc.querySelectorAll("[data-trials]"), function (b) { b.setAttribute("aria-haspopup", "dialog"); b.addEventListener("click", tOpen); });
    [].forEach.call(tm.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", tClose); });
    tm.addEventListener("click", function (e) { if (e.target === tm) tClose(); });
    doc.addEventListener("keydown", function (e) {
      if (tm.hidden) return;
      if (e.key === "Escape") { tClose(); return; }
      if (e.key === "Tab") {
        var f = tm.querySelectorAll("button, a[href]"); if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------- a human who is half of a whole: the infinity picture ---------- */
  var hg = doc.getElementById("hourglass");
  if (hg) {
    var NS2 = "http://www.w3.org/2000/svg";
    function v(tag, a, txt) { var e = doc.createElementNS(NS2, tag), k2; for (k2 in a) e.setAttribute(k2, a[k2]); if (txt) e.textContent = txt; return e; }
    var sv = v("svg", { viewBox: "0 0 200 116", role: "img", "aria-labelledby": "hg-t" });
    sv.appendChild(v("title", { id: "hg-t" }, "An infinity sign. The left loop is you in society, in the physical world. The right loop is your digital world. Your AI sits where the loops cross."));
    sv.appendChild(v("ellipse", { cx: 100, cy: 60, rx: 98, ry: 54, fill: "none", stroke: "currentColor", "stroke-width": ".5", "stroke-dasharray": "2 2", opacity: ".45" }));
    sv.appendChild(v("text", { x: 100, y: 11, "text-anchor": "middle", "font-size": "5", "font-weight": "700", fill: "currentColor", opacity: ".7" }, "Society, in both worlds"));
    var left = v("path", { d: "M100,62 C74,28 18,28 18,62 C18,96 74,96 100,62", fill: "rgba(255,204,51,.22)", stroke: "#ffb703", "stroke-width": "1.6" });
    var rightG = v("g", { "class": "hg-right" });
    rightG.appendChild(v("path", { d: "M100,62 C126,28 182,28 182,62 C182,96 126,96 100,62", fill: "rgba(122,92,240,.16)", stroke: "#7a5cf0", "stroke-width": "1.6" }));
    sv.appendChild(left);
    sv.appendChild(v("text", { x: 52, y: 44, "text-anchor": "middle", "font-size": "5.4", "font-weight": "800", fill: "currentColor" }, "You, in society"));
    sv.appendChild(v("text", { x: 52, y: 51, "text-anchor": "middle", "font-size": "4.2", fill: "currentColor", opacity: ".75" }, "the physical world"));
    sv.appendChild(v("text", { x: 52, y: 72, "text-anchor": "middle", "font-size": "11" }, "🧍"));
    [[30, 64], [36, 80], [70, 80], [74, 66]].forEach(function (pp) { sv.appendChild(v("circle", { cx: pp[0], cy: pp[1], r: 2.4, fill: "#ffb703", opacity: ".8" })); });
    rightG.appendChild(v("text", { x: 150, y: 41, "text-anchor": "middle", "font-size": "5.4", "font-weight": "800", fill: "currentColor" }, "Your digital world"));
    [["Phone calls", 116, 54], ["Texts", 124, 70], ["Email", 136, 56], ["Work chat", 146, 76], ["Social media", 160, 60], ["Servers", 170, 72], ["A warehouse", 166, 86]].forEach(function (it) {
      rightG.appendChild(v("circle", { cx: it[1], cy: it[2] - 1.4, r: 1.3, fill: "#7a5cf0" }));
      rightG.appendChild(v("text", { x: it[1] + 2.4, y: it[2], "font-size": "4", fill: "currentColor" }, it[0]));
    });
    rightG.appendChild(v("text", { x: 150, y: 97, "text-anchor": "middle", "font-size": "3.8", fill: "currentColor", opacity: ".7" }, "closer to you  ←  →  farther away"));
    sv.appendChild(rightG);
    var link = v("g", { "class": "hg-link" });
    link.appendChild(v("circle", { cx: 100, cy: 62, r: 7.5, fill: "#ffcc33", stroke: "#1c1a2b", "stroke-width": ".6" }));
    link.appendChild(v("text", { x: 100, y: 63.8, "text-anchor": "middle", "font-size": "4.4", "font-weight": "800", fill: "#1c1a2b" }, "AI"));
    sv.appendChild(link);
    sv.appendChild(v("text", { x: 100, y: 76, "text-anchor": "middle", "font-size": "4", "font-weight": "700", fill: "currentColor" }, "the layer between"));
    hg.appendChild(sv);
    var hcap = el("p", { "class": "hg-cap", "aria-live": "polite" });
    var hb = el("button", { type: "button", "class": "btn primary", "aria-pressed": "true", text: "Put your phone down" });
    var connected = true;
    function hset() {
      hg.classList.toggle("off", !connected);
      hb.textContent = connected ? "Put your phone down" : "Pick up your phone";
      hb.setAttribute("aria-pressed", String(connected));
      hcap.textContent = connected ? "Connected. You and your digital world form one whole, joined by your AI." : "Disconnected. You are half of a whole: cut off from your digital world, and from the people on the other side of their screens.";
    }
    hb.addEventListener("click", function () { connected = !connected; hset(); });
    hg.appendChild(el("div", { "class": "hg-ctl" }, [hb, hcap]));
    hset();
  }
})();
