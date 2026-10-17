/* Silent visitor logger, included on the main site's pages. Writes one
   document per browser per IST calendar day. */
(function () {
  "use strict";
  const CFG = window.__CONFIG__ || {};
  if (!CFG.endpoint || !CFG.projectId || !CFG.databaseId || !CFG.visitsCollectionId) {
    console.warn("[Visitor Tracking] Appwrite configuration missing, visitor logging skipped.", CFG);
    return;
  }

  // At most one write per browser per IST day, so refreshes don't flood the log.
  const istDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); // YYYY-MM-DD
  const KEY = "pb_visit_logged";
  const isForce = location.search.includes("track=1") || location.search.includes("log=1");

  try {
    if (!isForce && localStorage.getItem(KEY) === istDay()) {
      console.log("[Visitor Tracking] Visit already recorded for today (" + istDay() + "). Add ?track=1 to URL to log again for testing.");
      return;
    }
  } catch (e) { /* localStorage blocked: fall through and log anyway */ }

  async function geo() {
    // Two providers, 2.5s timeout on each so it never blocks the request.
    const fetchWithTimeout = async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        return null;
      }
    };

    try {
      const r = await fetchWithTimeout("https://get.geojs.io/v1/ip/geo.json");
      if (r && r.ok) {
        const d = await r.json();
        return { ip: d.ip, city: d.city, region: d.region, country: d.country, country_code: d.country_code, lat: Number(d.latitude) || null, lng: Number(d.longitude) || null };
      }
    } catch (e) { /* try the fallback */ }

    try {
      const r = await fetchWithTimeout("https://ipwho.is/");
      if (r && r.ok) {
        const d = await r.json();
        if (d.success !== false) return { ip: d.ip, city: d.city, region: d.region, country: d.country, country_code: d.country_code, lat: d.latitude, lng: d.longitude };
      }
    } catch (e) { /* give up on location, still log the visit */ }

    return {};
  }

  async function log() {
    console.log("[Visitor Tracking] Gathering visit details...");
    const loc = await geo();
    const doc = {
      ip: loc.ip || null,
      city: loc.city || null,
      region: loc.region || null,
      country: loc.country || null,
      country_code: loc.country_code || null,
      lat: loc.lat != null ? loc.lat : null,
      lng: loc.lng != null ? loc.lng : null,
      path: location.pathname || "/",
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      visited_at: new Date().toISOString(),
    };

    try {
      const url = CFG.endpoint.replace(/\/$/, "") + "/databases/" + CFG.databaseId + "/collections/" + CFG.visitsCollectionId + "/documents";
      console.log("[Visitor Tracking] Writing visit document to Appwrite...", doc);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": CFG.projectId,
          "X-Appwrite-Response-Format": "1.4.0",
        },
        body: JSON.stringify({ documentId: "unique()", data: doc }),
      });

      if (r.ok) {
        const res = await r.json();
        console.log("[Visitor Tracking] Visit logged successfully to Appwrite! ID:", res.$id);
        try { localStorage.setItem(KEY, istDay()); } catch (e) {}
      } else {
        const errText = await r.text();
        console.error("[Visitor Tracking] Appwrite returned error (" + r.status + "):", errText);
      }
    } catch (e) {
      console.error("[Visitor Tracking] Network error logging visit:", e);
    }
  }

  // Trigger quickly after page load
  setTimeout(log, 500);
})();
