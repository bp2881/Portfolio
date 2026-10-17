/* /visitors: gate, login, dashboard. Access control is Appwrite-side. */
(function () {
  "use strict";
  const CFG = window.__CONFIG__ || {};
  const $ = (s, r = document) => r.querySelector(s);

  const appwriteReady = !!(window.Appwrite && CFG.endpoint && CFG.projectId);
  let client, account, databases, Query;
  if (appwriteReady) {
    const AW = window.Appwrite;
    client = new AW.Client().setEndpoint(CFG.endpoint).setProject(CFG.projectId);
    account = new AW.Account(client);
    databases = new AW.Databases(client);
    Query = AW.Query;
  }

  /* ---------- gesture: 3 clicks on the mark, then 1 on the corner dot, within 10s ---------- */
  function initGesture() {
    const mark = $("#mark"), dot = $("#dot"), lock = $("#lock");
    let marks = 0, timer = null;
    const reset = () => { marks = 0; clearTimeout(timer); };
    const arm = () => { clearTimeout(timer); timer = setTimeout(reset, 10000); };
    mark.addEventListener("click", () => { marks++; arm(); if (marks > 3) reset(); });
    dot.addEventListener("click", () => {
      if (marks === 3) {
        reset();
        $(".gate-blank").remove();
        dot.remove();
        lock.hidden = false;
        if (!appwriteReady) {
          $("#err").textContent = "Appwrite not configured yet.";
        }
        $("#email").focus();
      } else reset();
    });
  }

  /* ---------- login ---------- */
  function initForm() {
    const form = $("#form"), err = $("#err");
    const btn = form.querySelector("button[type='submit']");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!appwriteReady) {
        console.error("Login aborted: Appwrite is not configured. window.__CONFIG__ is missing or incomplete.", { CFG, Appwrite: window.Appwrite });
        err.textContent = "Appwrite not configured (assets/js/config.js missing).";
        return;
      }
      err.textContent = "";
      const email = $("#email").value.trim(), pass = $("#pass").value;
      if (!email || !pass) {
        err.textContent = "Please enter email and password.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Unlocking...";
      try {
        // Clear any existing session to prevent 409 session conflict
        await account.deleteSession("current").catch(() => {});
        await account.createEmailPasswordSession(email, pass);
        await enter();
      } catch (ex) {
        console.error("Login error:", ex);
        let msg = "Incorrect email or password.";
        if (ex && ex.message) {
          if (ex.message.includes("Failed to fetch") || ex.message.includes("NetworkError")) {
            msg = "Network or CORS error. Add localhost/domain to Web platforms in Appwrite.";
          } else {
            msg = ex.message;
          }
        }
        err.textContent = msg;
      } finally {
        btn.disabled = false;
        btn.textContent = "Unlock";
      }
    });
  }

  /* ---------- dashboard state & helpers ---------- */
  let allRows = [];
  let filterCountry = null;
  let searchQuery = "";
  let dateFilter = "all"; // 'all', 'today', 'week'

  const fmtIST = (iso) => {
    if (!iso) return "Unknown";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(iso));
    } catch (e) { return String(iso); }
  };

  const istDateStr = (iso) => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
    } catch (e) { return ""; }
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return fmtIST(iso).split(",")[0];
  }

  function detectDevice(ua) {
    if (!ua) return { type: "Unknown", browser: "Browser" };
    const s = ua.toLowerCase();
    let type = "Desktop";
    if (s.includes("mobile") || s.includes("android") || s.includes("iphone")) type = "Mobile";
    else if (s.includes("tablet") || s.includes("ipad")) type = "Tablet";

    let browser = "Other";
    if (s.includes("chrome") || s.includes("crios")) browser = "Chrome";
    else if (s.includes("safari")) browser = "Safari";
    else if (s.includes("firefox")) browser = "Firefox";
    else if (s.includes("edg")) browser = "Edge";
    return { type, browser };
  }

  async function loadVisits() {
    console.log("[Visitors Dashboard] Fetching documents from Appwrite...");
    try {
      const res = await databases.listDocuments(CFG.databaseId, CFG.visitsCollectionId, [
        Query.orderDesc("visited_at"),
        Query.limit(200),
      ]);
      return res.documents || [];
    } catch (err) {
      console.warn("Index query fallback, loading listDocuments directly:", err);
      const res = await databases.listDocuments(CFG.databaseId, CFG.visitsCollectionId, [
        Query.limit(200),
      ]);
      const docs = res.documents || [];
      return docs.sort((a, b) => new Date(b.visited_at || b.$createdAt || 0) - new Date(a.visited_at || a.$createdAt || 0));
    }
  }

  /* ---------- Visual Renderers ---------- */
  function renderStats(rows) {
    const today = istDateStr(new Date());
    const todays = rows.filter((r) => r.visited_at && istDateStr(r.visited_at) === today);
    const countries = new Set(rows.map((r) => r.country).filter(Boolean));
    const cities = new Set(rows.map((r) => r.city).filter(Boolean));

    $("#stats").innerHTML = [
      [rows.length, "Visits Recorded", "all-time log stream"],
      [todays.length, "Today (IST)", `active on ${today}`],
      [countries.size, "Unique Countries", `${countries.size ? Array.from(countries).slice(0, 3).join(", ") : "no data"}`],
      [cities.size, "Unique Cities", `${cities.size ? Array.from(cities).slice(0, 3).join(", ") : "no data"}`],
    ].map(([n, l, sub]) => `
      <div class="dash-stat">
        <b>${n}</b>
        <span>${l}</span>
        <div class="stat-sub">${esc(sub)}</div>
      </div>
    `).join("");
  }

  function renderWorldMap(rows) {
    const landEl = $("#map-land");
    if (landEl && window.__WORLD_LAND__ && !landEl.getAttribute("d")) {
      landEl.setAttribute("d", window.__WORLD_LAND__);
    }

    const pinsGroup = $("#map-pins");
    if (!pinsGroup) return;
    pinsGroup.innerHTML = "";

    const validLocs = rows.filter((r) => typeof r.lat === "number" && typeof r.lng === "number");
    const locMap = {};

    validLocs.forEach((r, idx) => {
      const key = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
      if (!locMap[key]) {
        locMap[key] = {
          lat: r.lat,
          lng: r.lng,
          city: r.city,
          region: r.region,
          country: r.country,
          country_code: r.country_code,
          count: 0,
          isLatest: idx === 0,
          latestTime: r.visited_at || r.$createdAt,
          pages: new Set(),
        };
      }
      locMap[key].count++;
      if (r.path) locMap[key].pages.add(r.path);
    });

    const locations = Object.values(locMap);
    const activeLocsEl = $("#map-active-locs");
    if (activeLocsEl) activeLocsEl.textContent = `${locations.length} Location${locations.length === 1 ? "" : "s"} Plotted`;

    const tooltip = $("#map-tooltip");
    const stage = $("#map-stage");

    locations.forEach((loc) => {
      // Equirectangular projection to 1000x500
      const x = ((loc.lng + 180.0) * (1000.0 / 360.0));
      const latClamped = Math.max(-85.0, Math.min(85.0, loc.lat));
      const y = ((90.0 - latClamped) * (500.0 / 180.0));
      const r = Math.min(10, Math.max(3.5, 3 + Math.log2(loc.count) * 2));

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `map-pin ${loc.isLatest ? "latest" : ""}`);
      g.setAttribute("data-key", `${loc.city || ""}, ${loc.country || ""}`);

      g.innerHTML = `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.4).toFixed(1)}" class="pin-pulse" fill="none" stroke="var(--saffron)" stroke-opacity="0.6"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="pin-dot" fill="var(--saffron)"/>
      `;

      g.addEventListener("mouseenter", (e) => {
        if (!tooltip || !stage) return;
        const rect = stage.getBoundingClientRect();
        const px = (x / 1000) * rect.width;
        const py = (y / 500) * rect.height;

        tooltip.innerHTML = `
          <b>${esc(loc.city || "Unknown City")}, ${esc(loc.country || "Global")}</b>
          <span>${loc.count} visit${loc.count > 1 ? "s" : ""} • Last: ${esc(fmtIST(loc.latestTime))}</span>
          <span>Pages: ${esc(Array.from(loc.pages).slice(0, 3).join(", "))}</span>
        `;
        tooltip.style.left = `${px}px`;
        tooltip.style.top = `${py}px`;
        tooltip.hidden = false;
      });

      g.addEventListener("mouseleave", () => {
        if (tooltip) tooltip.hidden = true;
      });

      g.addEventListener("click", () => {
        filterCountry = loc.country || null;
        updateView();
        const resetBtn = $("#reset-map-filter");
        if (resetBtn) resetBtn.hidden = !filterCountry;
      });

      pinsGroup.appendChild(g);
    });

    // Country pills bar
    const pillsEl = $("#map-pills");
    if (pillsEl) {
      const countryCounts = {};
      rows.forEach((r) => {
        const c = r.country || "Unknown";
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
      const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

      pillsEl.innerHTML = topCountries.map(([c, count]) => `
        <button type="button" class="country-pill ${filterCountry === c ? "active" : ""}" data-country="${esc(c)}">
          <span>${esc(c)}</span>
          <b>${count}</b>
        </button>
      `).join("");

      pillsEl.querySelectorAll(".country-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          const c = btn.getAttribute("data-country");
          filterCountry = filterCountry === c ? null : c;
          updateView();
          const resetBtn = $("#reset-map-filter");
          if (resetBtn) resetBtn.hidden = !filterCountry;
        });
      });
    }
  }

  function renderTimelineChart(rows) {
    const wrap = $("#timeline-chart");
    if (!wrap) return;

    // Group by day for the last 14 days
    const days = [];
    const dayCounts = {};
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = istDateStr(d);
      days.push(ds);
      dayCounts[ds] = 0;
    }

    rows.forEach((r) => {
      const ds = istDateStr(r.visited_at || r.$createdAt);
      if (dayCounts[ds] !== undefined) dayCounts[ds]++;
    });

    const maxCount = Math.max(1, ...Object.values(dayCounts));
    const width = 500;
    const height = 150;
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barW = Math.max(8, (chartW / days.length) - 6);
    const todayStr = istDateStr(now);

    let barsSvg = "";
    days.forEach((ds, i) => {
      const count = dayCounts[ds];
      const barH = count > 0 ? Math.max(6, (count / maxCount) * chartH) : 2;
      const x = padding.left + i * (chartW / days.length) + ((chartW / days.length - barW) / 2);
      const y = padding.top + chartH - barH;
      const isToday = ds === todayStr;
      const label = isToday ? "Today" : ds.slice(5);

      barsSvg += `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3"
              class="chart-bar ${isToday ? "today" : ""}" fill="${isToday ? "var(--saffron)" : "var(--deck2)"}">
          <title>${ds}: ${count} visit${count === 1 ? "" : "s"}</title>
        </rect>
        <text x="${(x + barW / 2).toFixed(1)}" y="${height - 6}" font-family="var(--mono)" font-size="9" fill="var(--dim)" text-anchor="middle">
          ${label}
        </text>
        ${count > 0 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-family="var(--mono)" font-size="9" fill="${isToday ? "var(--saffron)" : "var(--fog)"}" text-anchor="middle">${count}</text>` : ""}
      `;
    });

    wrap.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--rule)" stroke-width="1"/>
        ${barsSvg}
      </svg>
    `;
  }

  function renderHourlyChart(rows) {
    const wrap = $("#hourly-chart");
    if (!wrap) return;

    const hourCounts = new Array(24).fill(0);
    rows.forEach((r) => {
      const dt = new Date(r.visited_at || r.$createdAt);
      try {
        const hour = parseInt(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(dt), 10);
        if (!isNaN(hour) && hour >= 0 && hour < 24) hourCounts[hour]++;
      } catch (e) {}
    });

    const maxCount = Math.max(1, ...hourCounts);
    const width = 400;
    const height = 150;
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barW = Math.max(4, (chartW / 24) - 3);

    let barsSvg = "";
    hourCounts.forEach((count, h) => {
      const barH = count > 0 ? Math.max(4, (count / maxCount) * chartH) : 2;
      const x = padding.left + h * (chartW / 24) + ((chartW / 24 - barW) / 2);
      const y = padding.top + chartH - barH;
      const showLabel = h % 4 === 0;

      barsSvg += `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2"
              class="chart-bar" fill="${count === maxCount && count > 0 ? "var(--saffron)" : "var(--deck2)"}">
          <title>${h}:00 - ${h + 1}:00 IST: ${count} visit${count === 1 ? "" : "s"}</title>
        </rect>
        ${showLabel ? `<text x="${(x + barW / 2).toFixed(1)}" y="${height - 6}" font-family="var(--mono)" font-size="9" fill="var(--dim)" text-anchor="middle">${h}h</text>` : ""}
      `;
    });

    wrap.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="var(--rule)" stroke-width="1"/>
        ${barsSvg}
      </svg>
    `;
  }

  function renderRankLists(rows) {
    const topCounts = (key, n) => {
      const c = {};
      rows.forEach((r) => { const v = r[key] || "Unknown"; c[v] = (c[v] || 0) + 1; });
      return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n);
    };

    const renderList = (elId, items, total) => {
      const el = $(elId);
      if (!el) return;
      if (!items.length) {
        el.innerHTML = '<p class="dash-empty">No data yet</p>';
        return;
      }
      const max = items[0][1] || 1;
      el.innerHTML = items.map(([k, v]) => {
        const pct = Math.round((v / max) * 100);
        return `
          <div class="rank-item">
            <div class="rank-info">
              <div class="rank-label">
                <span>${esc(k)}</span>
                <span>${v}</span>
              </div>
              <div class="rank-bar-bg">
                <div class="rank-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    };

    renderList("#countries", topCounts("country", 6), rows.length);
    renderList("#pages", topCounts("path", 6), rows.length);

    // Referrers
    const refCounts = {};
    const devCounts = { Mobile: 0, Desktop: 0, Tablet: 0 };
    rows.forEach((r) => {
      let ref = r.referrer;
      if (!ref || ref === "null") ref = "Direct / Bookmark";
      else {
        try { ref = new URL(ref).hostname.replace(/^www\./, ""); } catch (e) {}
      }
      refCounts[ref] = (refCounts[ref] || 0) + 1;

      const dev = detectDevice(r.user_agent);
      devCounts[dev.type] = (devCounts[dev.type] || 0) + 1;
    });

    const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topDevs = Object.entries(devCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    renderList("#referrers", [...topRefs, ...topDevs], rows.length);
  }

  function getFilteredRows() {
    let rows = allRows;
    if (filterCountry) {
      rows = rows.filter((r) => (r.country || "").toLowerCase() === filterCountry.toLowerCase());
    }
    if (dateFilter === "today") {
      const today = istDateStr(new Date());
      rows = rows.filter((r) => istDateStr(r.visited_at || r.$createdAt) === today);
    } else if (dateFilter === "week") {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      rows = rows.filter((r) => new Date(r.visited_at || r.$createdAt) >= weekAgo);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter((r) =>
        (r.ip || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q) ||
        (r.region || "").toLowerCase().includes(q) ||
        (r.country || "").toLowerCase().includes(q) ||
        (r.path || "").toLowerCase().includes(q) ||
        (r.user_agent || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }

  function renderTable(rows) {
    const tableWrap = $("#recent");
    const countSub = $("#table-count-sub");
    if (countSub) countSub.textContent = `Showing ${rows.length} of ${allRows.length} visits`;
    if (!tableWrap) return;

    if (!rows.length) {
      tableWrap.innerHTML = '<p class="dash-empty" style="text-align:center;padding:40px 0">No matching visits found.</p>';
      return;
    }

    const rowsHtml = rows.slice(0, 100).map((r) => {
      const loc = [r.city, r.region, r.country].filter(Boolean).join(", ") || (r.ip ? "Unknown Location" : "No Location");
      const dev = detectDevice(r.user_agent);
      const isTest = (r.city || "").includes("Test") || (r.country || "").includes("Test") || r.ip === "1.1.1.1";

      return `
        <tr data-doc-id="${esc(r.$id)}">
          <td>
            <div style="font-weight:500">${esc(fmtIST(r.visited_at || r.$createdAt))}</div>
            <div style="font-size:.72rem;color:var(--dim)">${esc(timeAgo(r.visited_at || r.$createdAt))}</div>
          </td>
          <td>
            <div>
              <span class="badge-tag badge-code">${esc(r.country_code || "??")}</span>
              <span style="font-weight:500">${esc(loc)}</span>
            </div>
            ${r.ip ? `<div class="badge-ip">${esc(r.ip)}</div>` : ""}
          </td>
          <td>
            <span class="badge-tag">${esc(r.path || "/")}</span>
          </td>
          <td>
            <span class="badge-tag">${esc(dev.type)} • ${esc(dev.browser)}</span>
          </td>
          <td>
            <button type="button" class="btn-del-row" data-id="${esc(r.$id)}" title="Delete this visit entry">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    tableWrap.innerHTML = `
      <table class="dtable">
        <thead>
          <tr>
            <th>When (IST)</th>
            <th>Location & IP</th>
            <th>Page</th>
            <th>Device</th>
            <th style="width:40px">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // Row deletion handlers
    tableWrap.querySelectorAll(".btn-del-row").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (!id) return;
        btn.disabled = true;
        btn.style.opacity = "0.3";

        try {
          await databases.deleteDocument(CFG.databaseId, CFG.visitsCollectionId, id);
          allRows = allRows.filter((row) => row.$id !== id);
          updateView();
          toast("Visit entry deleted from database.");
        } catch (err) {
          console.error("Failed to delete document:", err);
          btn.disabled = false;
          btn.style.opacity = "1";
          toast("Error deleting visit: " + (err.message || "Unauthorized"));
        }
      });
    });
  }

  function updateView() {
    const filtered = getFilteredRows();
    renderStats(allRows);
    renderWorldMap(allRows);
    renderTimelineChart(allRows);
    renderHourlyChart(allRows);
    renderRankLists(allRows);
    renderTable(filtered);
  }

  /* ---------- Action & Export Handlers ---------- */
  function exportCSV() {
    if (!allRows.length) {
      toast("No visits to export.");
      return;
    }
    const headers = ["ID", "Visited At (ISO)", "Visited At (IST)", "IP", "City", "Region", "Country", "Country Code", "Path", "Referrer", "User Agent"];
    const rows = allRows.map((r) => [
      r.$id || "",
      r.visited_at || r.$createdAt || "",
      fmtIST(r.visited_at || r.$createdAt),
      r.ip || "",
      r.city || "",
      r.region || "",
      r.country || "",
      r.country_code || "",
      r.path || "/",
      r.referrer || "",
      r.user_agent || "",
    ]);

    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pranavbairy_visitors_${istDateStr(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("CSV export downloaded.");
  }

  async function pruneTestVisits() {
    const testDocs = allRows.filter((r) =>
      (r.city || "").includes("Test") ||
      (r.country || "").includes("Test") ||
      (r.ip === "1.1.1.1") ||
      (r.region || "").includes("Admin")
    );

    if (!testDocs.length) {
      toast("No synthetic test visits found.");
      return;
    }

    if (!confirm(`Found ${testDocs.length} test visit(s). Delete them permanently from Appwrite?`)) return;

    const btn = $("#prune-test");
    if (btn) { btn.disabled = true; btn.textContent = "Pruning..."; }

    let deleted = 0;
    for (const doc of testDocs) {
      try {
        await databases.deleteDocument(CFG.databaseId, CFG.visitsCollectionId, doc.$id);
        deleted++;
      } catch (e) {
        console.warn("Could not delete test doc:", doc.$id, e);
      }
    }

    allRows = allRows.filter((r) => !testDocs.some((td) => td.$id === r.$id));
    updateView();
    if (btn) { btn.disabled = false; btn.textContent = "Prune Tests"; }
    toast(`Successfully pruned ${deleted} test visit(s).`);
  }

  async function logTestVisit() {
    const btn = $("#log-test");
    if (btn) { btn.disabled = true; btn.textContent = "Logging..."; }

    // Sample cities for rich visual demonstration on the world map
    const testCities = [
      { city: "Bengaluru", region: "Karnataka", country: "India", code: "IN", lat: 12.97, lng: 77.59 },
      { city: "San Francisco", region: "California", country: "United States", code: "US", lat: 37.77, lng: -122.41 },
      { city: "London", region: "England", country: "United Kingdom", code: "GB", lat: 51.50, lng: -0.12 },
      { city: "Tokyo", region: "Kanto", country: "Japan", code: "JP", lat: 35.67, lng: 139.65 },
      { city: "Sydney", region: "NSW", country: "Australia", code: "AU", lat: -33.86, lng: 151.20 },
      { city: "Berlin", region: "Berlin", country: "Germany", code: "DE", lat: 52.52, lng: 13.40 },
    ];
    const picked = testCities[Math.floor(Math.random() * testCities.length)];

    try {
      const url = CFG.endpoint.replace(/\/$/, "") + "/databases/" + CFG.databaseId + "/collections/" + CFG.visitsCollectionId + "/documents";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": CFG.projectId,
          "X-Appwrite-Response-Format": "1.4.0",
        },
        body: JSON.stringify({
          documentId: "unique()",
          data: {
            path: Math.random() > 0.4 ? "/" : "/visitors",
            visited_at: new Date().toISOString(),
            user_agent: String(navigator.userAgent || "Browser").slice(0, 30),
            city: picked.city.slice(0, 30),
            region: picked.region.slice(0, 30),
            country: picked.country.slice(0, 30),
            country_code: picked.code.slice(0, 5),
            lat: picked.lat,
            lng: picked.lng,
          },
        }),
      });

      if (res.ok) {
        toast(`Simulated visit logged for ${picked.city}, ${picked.country}!`);
        await enter();
      } else {
        const t = await res.text();
        console.error("Test log failed:", res.status, t);
        toast("Failed to log test visit: " + t);
      }
    } catch (e) {
      console.error("Test log error:", e);
      toast("Error: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Test Visit"; }
    }
  }

  function initToolbar() {
    $("#refresh")?.addEventListener("click", async () => {
      const btn = $("#refresh");
      if (btn) { btn.disabled = true; btn.textContent = "Refreshing..."; }
      await enter();
      if (btn) { btn.disabled = false; btn.textContent = "Refresh"; }
      toast("Visits reloaded.");
    });

    $("#log-test")?.addEventListener("click", logTestVisit);
    $("#export-csv")?.addEventListener("click", exportCSV);
    $("#prune-test")?.addEventListener("click", pruneTestVisits);

    $("#reset-map-filter")?.addEventListener("click", () => {
      filterCountry = null;
      $("#reset-map-filter").hidden = true;
      updateView();
    });

    const searchInput = $("#table-search");
    if (searchInput) {
      let deb;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(deb);
        deb = setTimeout(() => {
          searchQuery = e.target.value;
          renderTable(getFilteredRows());
        }, 120);
      });
    }

    $("#date-tabs")?.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $("#date-tabs").querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        dateFilter = btn.getAttribute("data-filter");
        renderTable(getFilteredRows());
      });
    });

    $("#signout")?.addEventListener("click", async () => {
      if (!appwriteReady) { location.reload(); return; }
      await account.deleteSession("current").catch(() => {});
      location.reload();
    });
  }

  async function enter() {
    try {
      allRows = await loadVisits();
      $(".gate-blank")?.remove();
      $("#dot")?.remove();
      $("#lock").hidden = true;
      $("#dash").classList.add("on");
      updateView();
    } catch (ex) {
      console.error("Dashboard authorization/load error:", ex);
      $(".gate-blank")?.remove();
      $("#dot")?.remove();
      $("#lock").hidden = false;
      const msg = ex && ex.message ? ex.message : "That account can't view this.";
      $("#err").textContent = msg;
    }
  }

  // Poll for new visits every 30s while dashboard is visible
  setInterval(() => {
    if ($("#dash")?.classList.contains("on")) {
      loadVisits().then((rows) => {
        allRows = rows;
        updateView();
      }).catch(() => {});
    }
  }, 30000);

  initGesture();
  initForm();
  initToolbar();

  // Already signed in from an earlier visit: skip straight to the dashboard.
  if (appwriteReady) account.get().then(enter).catch(() => {});
})();

