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
      if (!appwriteReady) { err.textContent = "Appwrite not configured yet."; return; }
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

  /* ---------- dashboard ---------- */
  const fmtIST = (iso) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function topCounts(rows, key, n) {
    const c = {};
    rows.forEach((r) => { const v = r[key] || "Unknown"; c[v] = (c[v] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  async function loadVisits() {
    // Newest first, up to 200. Fall back to in-memory sort if custom index on visited_at is missing.
    try {
      const res = await databases.listDocuments(CFG.databaseId, CFG.visitsCollectionId, [
        Query.orderDesc("visited_at"),
        Query.limit(200),
      ]);
      return res.documents;
    } catch (err) {
      console.warn("Index on visited_at may be missing, falling back to default listDocuments:", err);
      const res = await databases.listDocuments(CFG.databaseId, CFG.visitsCollectionId, [
        Query.limit(200),
      ]);
      const docs = res.documents || [];
      return docs.sort((a, b) => new Date(b.visited_at || b.$createdAt || 0) - new Date(a.visited_at || a.$createdAt || 0));
    }
  }

  function render(rows) {
    const istDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
    const today = istDate(new Date());
    const todays = rows.filter((r) => r.visited_at && istDate(r.visited_at) === today);
    const countries = new Set(rows.map((r) => r.country).filter(Boolean));

    $("#stats").innerHTML = [
      [rows.length, "visits shown"],
      [todays.length, "today, IST"],
      [countries.size, "countries"],
      [new Set(rows.map((r) => r.city).filter(Boolean)).size, "cities"],
    ].map(([n, l]) => `<div class="dash-stat"><b>${n}</b><span>${l}</span></div>`).join("");

    $("#recent").innerHTML = rows.length ? `<table class="dtable"><thead><tr><th>When</th><th>Location</th><th>Page</th></tr></thead><tbody>${rows.slice(0, 40).map((r) => {
      const loc = [r.city, r.region, r.country].filter(Boolean).join(", ") || (r.ip ? "Unknown location" : "No location");
      return `<tr><td>${esc(fmtIST(r.visited_at || r.$createdAt))}</td><td>${esc(loc)}</td><td>${esc(r.path || "/")}</td></tr>`;
    }).join("")
      }</tbody></table>` : '<p class="dash-empty">No visits logged yet.</p>';

    $("#countries").innerHTML = topCounts(rows, "country", 8).map(([k, v]) => `<li><span>${esc(k)}</span><span>${v}</span></li>`).join("") || '<li><span class="dash-empty">Nothing yet</span></li>';
    $("#pages").innerHTML = topCounts(rows, "path", 8).map(([k, v]) => `<li><span>${esc(k)}</span><span>${v}</span></li>`).join("") || '<li><span class="dash-empty">Nothing yet</span></li>';
  }

  async function enter() {
    try {
      const rows = await loadVisits();
      $(".gate-blank")?.remove();
      $("#dot")?.remove();
      $("#lock").hidden = true;
      $("#dash").classList.add("on");
      render(rows);
    } catch (ex) {
      console.error("Dashboard authorization/load error:", ex);
      $(".gate-blank")?.remove();
      $("#dot")?.remove();
      $("#lock").hidden = false;
      const msg = ex && ex.message ? ex.message : "That account can't view this.";
      $("#err").textContent = msg;
    }
  }

  $("#signout").addEventListener("click", async () => {
    if (!appwriteReady) { location.reload(); return; }
    await account.deleteSession("current").catch(() => { });
    location.reload();
  });

  initGesture();
  initForm();

  // Already signed in from an earlier visit: skip straight to the dashboard.
  if (appwriteReady) account.get().then(enter).catch(() => { });
})();

