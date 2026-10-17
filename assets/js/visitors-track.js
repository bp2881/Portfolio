/* Silent visitor logger, included on the main site's pages. Writes one
   document per browser per IST calendar day. Never blocks the page and
   never throws visibly. */
(function () {
  "use strict";
  const CFG = window.__CONFIG__ || {};
  if (!CFG.endpoint || !CFG.projectId) return; // not configured yet

  // At most one write per browser per IST day, so refreshes don't flood the log.
  const istDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); // YYYY-MM-DD
  const KEY = "pb_visit_logged";
  try {
    if (localStorage.getItem(KEY) === istDay()) return;
  } catch (e) { /* localStorage blocked: fall through and log anyway */ }

  async function geo() {
    // Two providers, no key needed for either. If both fail, log with no location
    // rather than not logging at all.
    try {
      const r = await fetch("https://get.geojs.io/v1/ip/geo.json", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        return { ip: d.ip, city: d.city, region: d.region, country: d.country, country_code: d.country_code, lat: Number(d.latitude) || null, lng: Number(d.longitude) || null };
      }
    } catch (e) { /* try the fallback */ }
    try {
      const r = await fetch("https://ipwho.is/", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (d.success !== false) return { ip: d.ip, city: d.city, region: d.region, country: d.country, country_code: d.country_code, lat: d.latitude, lng: d.longitude };
      }
    } catch (e) { /* give up on location, still log the visit */ }
    return {};
  }

  async function log() {
    const loc = await geo();
    const doc = {
      ip: loc.ip || null,
      city: loc.city || null,
      region: loc.region || null,
      country: loc.country || null,
      country_code: loc.country_code || null,
      lat: loc.lat != null ? loc.lat : null,
      lng: loc.lng != null ? loc.lng : null,
      path: location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      visited_at: new Date().toISOString(),
    };
    try {
      const url = CFG.endpoint.replace(/\/$/, "") + "/databases/" + CFG.databaseId + "/collections/" + CFG.visitsCollectionId + "/documents";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Appwrite-Project": CFG.projectId, "X-Appwrite-Response-Format": "1.4.0" },
        body: JSON.stringify({ documentId: "unique()", data: doc }),
      });
      if (r.ok) { try { localStorage.setItem(KEY, istDay()); } catch (e) {} }
    } catch (e) { /* offline, blocked, or misconfigured: silently skip */ }
  }

  if ("requestIdleCallback" in window) requestIdleCallback(log, { timeout: 4000 });
  else setTimeout(log, 1200);
})();
