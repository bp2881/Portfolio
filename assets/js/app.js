(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CFG = window.__CONFIG__ || {};
  const MANUAL = window.__MANUAL__ || { contests: [] };
  const LINKS = window.__LINKS__ || {};
  let S = window.__SNAPSHOT__ || {};

  const NAMES = { github: "GitHub", leetcode: "LeetCode", codeforces: "Codeforces", codechef: "CodeChef" };
  const URLS = {
    github: "https://github.com/bp2881",
    leetcode: "https://leetcode.com/u/pranavbairy2/",
    codeforces: "https://codeforces.com/profile/pranavbairy",
    codechef: "https://www.codechef.com/users/bp28",
  };
  const CP = ["leetcode", "codeforces", "codechef"];
  const FEATURED = new Set(["SatHarmoGAN", "PLUTO", "yag", "home-stream", "RemoteSync", "for_better_tomorrow", "VIKSHAN", "bp2881"]);

  /* ---------- formatting ---------- */
  const fmtDate = (iso, o) => {
    const t = new Date(iso);
    if (isNaN(t)) return "";
    return new Intl.DateTimeFormat("en-GB", Object.assign({ day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }, o || {})).format(t);
  };
  function ago(iso) {
    const t = Date.parse(iso);
    if (isNaN(t)) return "";
    const s = (Date.now() - t) / 1000;
    if (s < 3600) return "under an hour ago";
    if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? " hour ago" : " hours ago"); }
    const d = Math.floor(s / 86400);
    if (d < 45) return d === 1 ? "yesterday" : d + " days ago";
    return "on " + fmtDate(iso);
  }
  const num = (n) => (n == null ? "" : Number(n).toLocaleString("en-US"));
  const ARROW = '<svg aria-hidden="true"><use href="#ar"/></svg>';

  /* ---------- replayable animations ----------
     An element starts when at least a quarter of it is visible and resets once it
     has fully left the screen, so it can play again on the next visit. Resetting
     only happens off screen, and every start begins from the reset state, so a
     fast scroll back and forth cannot leave an animation half applied. */
  const watchers = new WeakMap();
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const w = watchers.get(en.target);
          if (!w) return;
          const tall = en.intersectionRect.height > innerHeight * 0.5;
          if (en.isIntersecting && (en.intersectionRatio >= 0.25 || tall)) {
            if (!w.on) { w.on = true; w.start(); }
          } else if (!en.isIntersecting && w.on) {
            w.on = false;
            if (w.stop) w.stop();
          }
        });
      }, { threshold: [0, 0.25, 0.5] })
    : null;
  function watch(el, start, stop) {
    if (!el) return;
    if (!io || reduce) { start(true); return; }
    watchers.set(el, { start, stop, on: false });
    io.observe(el);
  }
  function unwatch(el) {
    if (el && io) { io.unobserve(el); watchers.delete(el); }
  }
  // Plays the first time it is seen and never again, even if the section is rebuilt
  // when fresh data arrives: a rebuilt element that already played appears finished.
  const played = new Set();
  function playOnce(el, key) {
    if (!el) return;
    if (played.has(key)) { el.classList.add("run"); return; }
    watch(el, () => { el.classList.add("run"); played.add(key); unwatch(el); });
  }

  /* ---------- header status ---------- */
  function clock() {
    const t = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date());
    $("#clock").textContent = "Hyderabad " + t;
  }
  function renderStatus() {
    const lp = S.github && S.github.latest_push;
    $("#lastpush").innerHTML = lp && lp.repo
      ? 'Last push <a href="https://github.com/bp2881/' + esc(lp.repo) + '">' + esc(lp.repo) + "</a> " + esc(ago(lp.at))
      : "";
  }

  /* ---------- repos ---------- */
  function renderPushDates() {
    const rm = {};
    ((S.github && S.github.repos) || []).forEach((r) => (rm[r.name] = r));
    $$("[data-repo]").forEach((el) => {
      const r = rm[el.dataset.repo], tgt = $("[data-push]", el);
      if (tgt) tgt.textContent = r && r.pushed_at ? "Last push " + fmtDate(r.pushed_at) : "";
    });
  }
  function renderRepoIndex() {
    const repos = ((S.github && S.github.repos) || []).filter((r) => !FEATURED.has(r.name) && !r.fork)
      .sort((a, b) => (b.pushed_at || "").localeCompare(a.pushed_at || ""));
    $("#repos").innerHTML = repos.map((r) =>
      '<a href="' + esc(r.url) + '"><b>' + esc(r.name) + "</b><span>" + esc(r.description || "") + "</span><span>" + esc(r.language || "") + "</span><span>" + esc(fmtDate(r.pushed_at)) + "</span></a>").join("");
  }

  /* ---------- contests ---------- */
  function contestRows() {
    const rows = [];
    const add = (platform, list) => {
      let prev = null;
      (list || []).forEach((c, idx) => {
        const delta = c.delta != null ? c.delta : c.old != null && c.rating != null ? c.rating - c.old : prev != null && c.rating != null ? c.rating - prev : null;
        if (c.rating != null) prev = c.rating;
        rows.push({ platform, title: c.title, at: c.at, rank: c.rank, rating: c.rating, delta, solved: c.solved, of: c.of, idx });
      });
    };
    add("LeetCode", S.leetcode && S.leetcode.contests);
    add("Codeforces", S.codeforces && S.codeforces.contests);
    add("CodeChef", S.codechef && S.codechef.contests);
    (MANUAL.contests || []).forEach((m) => {
      if (!rows.some((r) => r.platform === m.platform && r.title === m.title))
        rows.push({ platform: m.platform, title: m.title, at: m.at, rank: m.rank, rating: m.rating, delta: m.delta != null ? m.delta : null, solved: m.solved, of: m.of, idx: 1e6 });
    });
    rows.sort((a, b) => {
      if (a.at && b.at) return b.at.localeCompare(a.at);
      if (a.at) return -1;
      if (b.at) return 1;
      return a.platform === b.platform ? b.idx - a.idx : a.platform.localeCompare(b.platform);
    });
    return rows;
  }
  function panel(k, lead, cap, lines, pending) {
    const d = S[k] || {};
    return '<div class="plat"><h4><a class="lnk ext" href="' + esc(d.url || URLS[k]) + '">' + NAMES[k] + '</a><span class="fog">' + esc(d.handle || "") + "</span></h4>" +
      (pending
        ? '<p class="pend">' + esc(pending) + "</p>"
        : '<span class="big">' + lead + '</span><span class="cap">' + esc(cap) + "</span><ul>" + lines.map((l) => "<li><span>" + esc(l[0]) + "</span><span>" + esc(l[1]) + "</span></li>").join("") + "</ul>") + "</div>";
  }
  function renderContests() {
    const lc = S.leetcode, cf = S.codeforces, cc = S.codechef;
    const parts = [];

    if (lc) {
      const lines = [], langs = lc.languages || [], diff = lc.solved_by_difficulty || {};
      let lead = "", cap = "";
      const push = (label, v) => { if (v != null && v !== "") lines.push([label, v]); };
      if (lc.contest) {
        lead = num(lc.contest.rating); cap = "contest rating";
        push("Contests entered", num(lc.contest.attended));
        push("Global rank", num(lc.contest.global_rank));
        if (lc.contest.top_percent != null) push("Top", lc.contest.top_percent.toFixed(1) + "%");
        push("Problems solved", num(lc.solved_total));
      } else if (lc.solved_total != null) {
        lead = num(lc.solved_total); cap = "problems solved";
        if (lc.ranking) push("Global rank", num(lc.ranking));
      } else if (langs.length) {
        lead = num(langs[0].solved); cap = "solved in " + langs[0].name;
      }
      ["Easy", "Medium", "Hard"].forEach((d) => { if (diff[d] != null) push(d, num(diff[d])); });
      langs.slice(0, 3).forEach((l) => push("Solved in " + l.name, num(l.solved)));
      (lc.badges || []).forEach((b) => push("Badge", b));
      parts.push(panel("leetcode", lead, cap, lines));
    } else parts.push(panel("leetcode", "", "", [], "Syncs on the next daily run."));

    if (cf && cf.rating != null) {
      const lines = [["Peak", num(cf.max_rating) + (cf.max_rank_title ? ", " + cf.max_rank_title : "")], ["Contests entered", num(cf.attended)]];
      if (cf.solved_total != null) lines.push(["Solved", num(cf.solved_total)]);
      parts.push(panel("codeforces", num(cf.rating), "rating" + (cf.rank_title ? ", " + cf.rank_title : ""), lines));
    } else parts.push(panel("codeforces", "", "", [], "Rating, contests and solved count appear after the first sync."));

    if (cc && cc.rating != null) {
      const lines = [];
      if (cc.attended != null) lines.push(["Rated contests", num(cc.attended)]);
      const ranked = (cc.contests || []).filter((c) => c.rank);
      if (ranked.length) { const b = ranked.reduce((m, c) => (c.rank < m.rank ? c : m)); lines.push(["Best contest rank", num(b.rank)]); }
      if (cc.solved_total != null) lines.push(["Solved", num(cc.solved_total)]);
      if (cc.global_rank) lines.push(["Global rank", num(cc.global_rank)]);
      parts.push(panel("codechef", num(cc.rating), "rating" + (cc.stars ? ", " + cc.stars + " star" : ""), lines));
    } else parts.push(panel("codechef", "", "", [], "Syncs on the next daily run."));

    const host = $("#plats");
    host.className = "plats";
    host.innerHTML = parts.join("");
    $$("a.ext", host).forEach((a) => a.insertAdjacentHTML("beforeend", ARROW));

    const all = contestRows(), LIMIT = 10;
    const rows = all.slice(0, LIMIT);
    const anyDates = rows.some((r) => r.at);
    const result = (r) => {
      const bits = [];
      if (r.rating != null) bits.push("rating " + r.rating + (r.delta != null ? ' (<span class="' + (r.delta >= 0 ? "up" : "") + '">' + (r.delta >= 0 ? "+" : "") + r.delta + "</span>)" : ""));
      if (r.solved != null) bits.push(r.solved + (r.of ? " of " + r.of : "") + " solved");
      return bits.join(", ");
    };
    $("#ledger").innerHTML = rows.length
      ? '<table class="lg"><thead><tr><th>Contest</th><th>Platform</th>' + (anyDates ? "<th>Date</th>" : "") + '<th class="n">Rank</th><th>Result</th></tr></thead><tbody>' +
        rows.map((r) => "<tr><td>" + esc(r.title) + '</td><td class="pf">' + r.platform + "</td>" + (anyDates ? "<td>" + (r.at ? esc(fmtDate(r.at)) : "") + "</td>" : "") + '<td class="n">' + (r.rank ? num(r.rank) : "") + "</td><td>" + result(r) + "</td></tr>").join("") + "</tbody></table>" +
        (all.length > LIMIT ? '<p class="lg-note">Latest ' + LIMIT + " of " + all.length + " contests.</p>" : "")
      : '<p class="lg-note">Contest history appears after the first sync.</p>';
  }

  /* ---------- activity: one grid for GitHub, one for all contest sites ---------- */
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const LABEL = { leetcode: "LeetCode", codeforces: "Codeforces", codechef: "CodeChef", solutions: "GitHub solutions" };
  function calMarkup(days, label) {
    const first = days.length ? new Date(days[0].d + "T00:00:00Z").getUTCDay() : 0;
    const cells = [];
    for (let i = 0; i < first; i++) cells.push('<i style="visibility:hidden"></i>');
    days.forEach((d, i) => {
      const col = Math.floor((i + first) / 7);
      cells.push('<i data-l="' + d.l + '"' + (d.c ? " data-c" : "") + ' data-t="' + esc(d.t) + '" style="--w:' + col + '"></i>');
    });
    const months = [];
    let lastM = -1;
    const cols = Math.ceil((days.length + first) / 7);
    days.forEach((d, i) => {
      const dt = new Date(d.d + "T00:00:00Z"), col = Math.floor((i + first) / 7);
      if (dt.getUTCMonth() !== lastM) {
        if (dt.getUTCDate() <= 7 && col < cols - 1 && i > 0) months.push('<span style="--col:' + col + '">' + dt.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }) + "</span>");
        lastM = dt.getUTCMonth();
      }
    });
    return '<div class="cal-wrap"><div class="cal-in"><div class="months" aria-hidden="true">' + months.join("") + '</div><div class="cal" role="img" aria-label="' + esc(label) + '">' + cells.join("") + "</div></div></div>";
  }
  function levelsFor(values) {
    const nz = values.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p) => (nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 0);
    const q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
    return (v) => (v <= 0 ? 0 : v <= q1 ? 1 : v <= q2 ? 2 : v <= q3 ? 3 : 4);
  }
  function renderActivity() {
    const gh = S.github, host = $("#activity-mount");
    $$(".cal, .langs", host).forEach(unwatch);
    if (!gh || !gh.calendar) { host.innerHTML = '<p class="act-note">GitHub activity appears after the first sync.</p>'; return; }
    const cal = gh.calendar, ghDays = cal.days || [];

    // github grid
    const gDays = ghDays.map((d) => ({ d: d[0], l: d[2], t: d[1] + (d[1] === 1 ? " contribution" : " contributions") + ", " + fmtDate(d[0]) }));
    const gLead = num(cal.total) + " contributions in the last year";
    const gSub = cal.includes_private ? "Includes " + num(cal.private) + " private, counts only." : "Public activity only.";

    // competitive programming grid, on the same date range so columns line up
    const range = gDays.length ? gDays.map((d) => d.d) : (function () {
      const end = new Date((S.generated_at || new Date().toISOString()).slice(0, 10) + "T00:00:00Z"), out = [];
      for (let i = 370; i >= 0; i--) out.push(isoDay(new Date(end.getTime() - i * 864e5)));
      return out;
    })();
    const inRange = new Set(range);
    const perDay = {}, totals = {};
    const addDaily = (key, daily) => Object.keys(daily || {}).forEach((day) => {
      if (!inRange.has(day)) return;
      (perDay[day] = perDay[day] || {})[key] = (perDay[day][key] || 0) + daily[day];
      totals[key] = (totals[key] || 0) + daily[day];
    });
    CP.forEach((k) => addDaily(k, S[k] && S[k].daily));
    addDaily("solutions", gh.solutions && gh.solutions.daily); // one commit per solved problem, from your solutions repo
    const contestDays = {};
    contestRows().forEach((r) => { if (r.at && inRange.has(r.at.slice(0, 10))) (contestDays[r.at.slice(0, 10)] = contestDays[r.at.slice(0, 10)] || []).push(r.title); });
    const sums = range.map((d) => Object.values(perDay[d] || {}).reduce((a, b) => a + b, 0));
    const lvl = levelsFor(sums);
    const cDays = range.map((d, i) => {
      const parts = Object.keys(perDay[d] || {}).map((k) => LABEL[k] + " " + perDay[d][k]);
      let t = sums[i] + (sums[i] === 1 ? " problem or submission" : " problems and submissions") + ", " + fmtDate(d) + (parts.length ? " (" + parts.join(", ") + ")" : "");
      if (contestDays[d]) t += ". Contest: " + contestDays[d].join(", ");
      return { d, l: lvl(sums[i]), c: !!contestDays[d], t };
    });
    const totalSub = sums.reduce((a, b) => a + b, 0);
    const nContests = Object.values(contestDays).reduce((a, l) => a + l.length, 0);
    const cLead = totalSub
      ? num(totalSub) + " problems and submissions" + (nContests ? ", " + nContests + (nContests === 1 ? " contest" : " contests") : "") + " in the last year"
      : (nContests ? nContests + (nContests === 1 ? " contest" : " contests") + " in the last year" : "Problem solving, last year");
    const cSub = totalSub ? Object.keys(totals).map((k) => LABEL[k] + " " + num(totals[k])).join(", ") : "Daily problem solving appears after the first sync.";

    // feed and languages (GitHub)
    let events = (gh.events || []).slice(0, 8);
    if (!events.length) {
      events = (gh.repos || []).filter((r) => r.pushed_at).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 8)
        .map((r) => ({ at: r.pushed_at, repo: r.name, kind: "push", text: r.description || "pushed" }));
    }
    const feed = events.map((e) => '<li><b><a class="lnk" href="https://github.com/bp2881/' + esc(e.repo) + '">' + esc(e.repo) + '</a></b><time datetime="' + esc(e.at) + '">' + esc(ago(e.at)) + '</time><span class="x">' + esc(e.text) + "</span></li>").join("");
    const counts = {};
    (gh.repos || []).filter((r) => !r.fork && r.language).forEach((r) => (counts[r.language] = (counts[r.language] || 0) + 1));
    const langs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6), max = langs.length ? langs[0][1] : 1;
    const lang = langs.map((l) => "<li><span>" + esc(l[0]) + '</span><span class="bar"><i style="--w:' + Math.round((l[1] / max) * 100) + '%"></i></span><em>' + l[1] + "</em></li>").join("");

    host.innerHTML =
      '<div class="act-block"><div class="act-top"><b>' + esc(gLead) + "</b><span>" + esc(gSub) + "</span></div>" + calMarkup(gDays, gLead) +
      '<div class="legend" aria-hidden="true">Less<i></i><i></i><i></i><i></i><i></i>More</div></div>' +
      '<div class="act-block"><div class="act-top"><b>' + esc(cLead) + "</b><span>" + esc(cSub) + "</span></div>" + calMarkup(cDays, cLead) +
      '<div class="legend" aria-hidden="true">Less<i></i><i></i><i></i><i></i><i></i>More<span class="k"></span>Contest day. Includes practice, not only contests.</div></div>' +
      '<div class="act-cols"><div><h4>Recent on GitHub</h4><ul class="feed">' + feed + '</ul></div><div><h4>Repositories by main language</h4><ul class="langs">' + lang + "</ul></div></div>";

    $$(".cal", host).forEach((c, i) => { playOnce(c, "cal" + i); bindTips(c); });
    playOnce($(".langs", host), "langs");
  }
  function bindTips(cal) {
    const tip = $("#tip");
    cal.addEventListener("pointermove", (e) => {
      const c = e.target.closest("i[data-t]");
      if (!c) { tip.classList.remove("on"); return; }
      tip.textContent = c.dataset.t;
      tip.style.left = Math.min(Math.max(e.clientX, 120), innerWidth - 120) + "px";
      tip.style.top = e.clientY + "px";
      tip.classList.add("on");
    });
    cal.addEventListener("pointerleave", () => tip.classList.remove("on"));
  }

  /* ---------- footer note ---------- */
  function renderStamp() {
    const notes = [];
    Object.keys(NAMES).forEach((k) => {
      const m = (S.sources || {})[k];
      if (m && m.stale) notes.push(NAMES[k] + " is showing data from " + fmtDate(m.fetched_at) + " because its latest sync failed.");
    });
    if (S.generated_at && (Date.now() - Date.parse(S.generated_at)) / 36e5 > 36) notes.push("The daily refresh may have stopped.");
    $("#stamp").textContent = S.generated_at ? ["Live data last built " + fmtDate(S.generated_at) + ". Refreshed once a day."].concat(notes).join(" ") : "";
  }

  function renderLive() {
    renderStatus();
    renderPushDates();
    renderRepoIndex();
    renderContests();
    renderActivity();
    renderStamp();
  }

  /* ---------- pipeline explorer ---------- */
  function initPipe() {
    const wrap = $("#pipe-wrap"), detail = $("#pipe-detail");
    const buttons = $$("button[data-d]", wrap);
    const show = (b) => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      detail.innerHTML = b.dataset.d;
    };
    buttons.forEach((b) => {
      b.addEventListener("click", () => show(b));
      b.addEventListener("mouseenter", () => show(b));
      b.addEventListener("focus", () => show(b));
    });
    show(buttons[3]);
    const lanes = [$("#pipe-main"), $("#pipe-checks")];
    watch(wrap, () => lanes.forEach((l) => l.classList.add("run")), () => lanes.forEach((l) => l.classList.remove("run")));
  }

  /* ---------- project visuals ---------- */
  function initViz() {
    $$("[data-viz]").forEach((el) => {
      const kind = el.dataset.viz;
      el.innerHTML = window.Viz[kind]();
      if (kind === "sat") window.Viz.prepSat(el);
      watch(el,
        (instant) => { el.classList.add("run"); if (kind === "sat") window.Viz.playSat(el, instant === true); },
        () => { el.classList.remove("run"); if (kind === "sat") window.Viz.stopSat(el); });
    });
  }

  /* ---------- images ---------- */
  function initImages() {
    const missing = (img) => {
      if (img.hasAttribute("data-optional")) { img.remove(); return; }
      const box = document.createElement("div");
      box.className = "slot-missing";
      box.textContent = "Add image: " + (img.dataset.slot || "");
      if (img.hasAttribute("data-keep")) { img.replaceWith(box); return; }
      const host = img.closest(".award") || img.closest("figure");
      (img.closest(".plate") || img).replaceWith(box);
      if (host) host.classList.add("is-missing");
      $$(".figs").forEach((f) => { if (!$("figure:not(.is-missing)", f)) f.classList.add("is-missing"); });
    };
    $$("img[src]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) missing(img);
      else img.addEventListener("error", () => missing(img), { once: true });
    });
  }
  function initLightbox() {
    const lb = $("#lb");
    if (!lb) return;
    const img = $(".lb-stage img", lb), cap = $(".lb-cap", lb), count = $(".lb-count", lb);
    let items = [], idx = 0, opener = null, busy = false;
    const visible = () => $$("[data-zoom]").filter((b) => b.offsetParent !== null && $("img", b));
    const shownRect = (b) => { // where the picture really is inside its thumbnail (object-fit: contain)
      const im = $("img", b), r = im.getBoundingClientRect(), nw = im.naturalWidth, nh = im.naturalHeight;
      if (!nw || !nh) return r;
      const k = Math.min(r.width / nw, r.height / nh), w = nw * k, h = nh * k;
      return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
    };
    const flip = (from, to) => "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + from.width / to.width + "," + from.height / to.height + ")";
    const EASE = "cubic-bezier(.2,.75,.15,1)";

    function show(i, from) {
      idx = (i + items.length) % items.length;
      opener = items[idx];
      const src = $("img", opener);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      const fig = opener.closest("figure"), fc = fig && fig.querySelector("figcaption");
      cap.textContent = opener.dataset.caption || (fc ? fc.textContent : "");
      count.textContent = items.length > 1 ? idx + 1 + " of " + items.length : "";
      lb.classList.toggle("single", items.length < 2);
      const play = () => {
        if (reduce) return;
        if (from) {
          const to = img.getBoundingClientRect();
          img.animate([{ transformOrigin: "0 0", transform: flip(from, to) }, { transformOrigin: "0 0", transform: "none" }], { duration: 340, easing: EASE });
          lb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
        } else img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      };
      if (img.complete && img.naturalWidth) play(); else img.onload = play;
    }
    function open(b) {
      items = visible();
      lb.hidden = false;
      document.documentElement.style.overflow = "hidden";
      show(items.indexOf(b), shownRect(b));
      $(".lb-x", lb).focus();
    }
    function close() {
      if (busy || lb.hidden) return;
      const done = () => { lb.hidden = true; document.documentElement.style.overflow = ""; busy = false; if (opener) opener.focus({ preventScroll: true }); };
      const r = opener ? opener.getBoundingClientRect() : null;
      const onScreen = r && r.bottom > 0 && r.top < innerHeight;
      if (reduce) { done(); return; }
      busy = true;
      const cur = img.getBoundingClientRect();
      const a1 = onScreen
        ? img.animate([{ transformOrigin: "0 0", transform: "none" }, { transformOrigin: "0 0", transform: flip(shownRect(opener), cur) }], { duration: 260, easing: EASE, fill: "forwards" })
        : img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      const a2 = lb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
      a1.onfinish = () => { a1.cancel(); a2.cancel(); done(); };
    }
    const step = (d) => { if (items.length > 1 && !busy) show(idx + d, null); };

    $$("[data-zoom]").forEach((b) => b.addEventListener("click", () => open(b)));
    $(".lb-x", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", () => step(-1));
    $(".lb-next", lb).addEventListener("click", () => step(1));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
    addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Tab") { // keep focus inside the viewer
        const f = $$("button", lb).filter((b) => getComputedStyle(b).visibility !== "hidden");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- header ---------- */
  function initHeader() {
    const bar = $("#top-bar");
    const onScroll = () => bar.classList.toggle("scrolled", scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    const links = $$(".nav a"), map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    if (!("IntersectionObserver" in window)) return;
    const so = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { links.forEach((a) => a.classList.remove("on")); const a = map.get(e.target.id); if (a) a.classList.add("on"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["experience", "projects", "contests", "activity", "contact"].forEach((id) => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- remote snapshot ---------- */
  async function loadRemote() {
    if (!CFG.endpoint || !CFG.projectId) return;
    try {
      const url = CFG.endpoint.replace(/\/$/, "") + "/storage/buckets/" + CFG.bucketId + "/files/" + (CFG.snapshotFileId || "snapshot") + "/view?project=" + CFG.projectId;
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) return;
      const remote = await r.json();
      if (remote && remote.generated_at && (!S.generated_at || remote.generated_at > S.generated_at)) {
        S = remote;
        renderLive();
      }
    } catch (e) { /* keep the baked snapshot */ }
  }

  /* ---------- links you fill in later, and the tab icon ---------- */
  function applyLinks() {
    $$("[data-link]").forEach((el) => {
      const url = LINKS[el.dataset.link];
      if (url) { el.setAttribute("href", url); el.classList.add("ext"); }
      else if (el.dataset.fallback) el.setAttribute("href", el.dataset.fallback);
      else if (el.hasAttribute("data-optional-link")) el.remove();
      else el.replaceWith(document.createTextNode(el.textContent)); // no link yet: plain text, never a dead link
    });
  }
  function initFavicon() {
    const probe = new Image();
    probe.onload = () => { const l = $("#favicon"); if (l) l.setAttribute("href", "assets/logos/favicon.png"); };
    probe.src = "assets/logos/favicon.png";
  }

  /* ---------- boot ---------- */
  function boot() {
    applyLinks();
    initFavicon();
    $$("a.ext").forEach((a) => a.insertAdjacentHTML("beforeend", ARROW));
    clock();
    setInterval(clock, 20000);
    initHeader();
    initPipe();
    initViz();
    initImages();
    initLightbox();
    renderLive();
    const hero = $(".hero");
    watch(hero, () => hero.classList.add("ready"), () => hero.classList.remove("ready"));
    loadRemote();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
