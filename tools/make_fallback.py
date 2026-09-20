"""Offline starter for assets/data/snapshot.js. Prefer tools/refresh_data.py, which reads the live sites.

Builds assets/data/snapshot.js, the baked-in data the site shows before (or
without) the daily Appwrite sync. Re-run to refresh it from public pages:

    python tools/make_fallback.py

GitHub calendar and repo list are read from public GitHub pages. LeetCode and
CodeChef values were copied from the public profiles on the build date, and
Codeforces is left empty until the first function run fills it."""
import datetime as dt
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "functions", "sync", "src"))
from sources import github  # noqa: E402

LOGIN = "bp2881"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf8", "replace")


def repos():
    import html
    page = get(f"https://github.com/{LOGIN}?tab=repositories&type=source")
    out = []
    for it in re.findall(r'<li[^>]*itemprop="owns"[^>]*>(.*?)</li>', page, re.S):
        name = re.search(r'itemprop="name codeRepository"[^>]*>\s*([^<\s]+)', it)
        desc = re.search(r'itemprop="description"[^>]*>\s*(.*?)\s*</p>', it, re.S)
        lang = re.search(r'itemprop="programmingLanguage">([^<]+)<', it)
        upd = re.search(r'datetime="([^"]+)"', it)
        if not name:
            continue
        out.append({
            "name": name.group(1),
            "description": html.unescape(re.sub(r"<[^>]+>", "", desc.group(1)).strip()) if desc else None,
            "url": f"https://github.com/{LOGIN}/{name.group(1)}",
            "language": lang.group(1) if lang else None,
            "pushed_at": upd.group(1) if upd else None,
            "stars": 0, "fork": False,
        })
    return sorted(out, key=lambda r: r["pushed_at"] or "", reverse=True)


now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
cal = github.parse_calendar_html(get(f"https://github.com/users/{LOGIN}/contributions"))
rp = repos()

snap = {
    "schema": 1,
    "generated_at": now,
    "sources": {
        "github": {"ok": True, "fetched_at": now, "stale": False},
        "leetcode": {"ok": True, "fetched_at": now, "stale": False},
        "codeforces": {"ok": False, "fetched_at": None, "stale": False},
        "codechef": {"ok": True, "fetched_at": now, "stale": False},
    },
    "github": {
        "login": LOGIN, "name": "Pranav Bairy", "followers": None, "public_repos": len(rp),
        "calendar": {"total": cal["total"], "days": cal["days"], "private": 0, "includes_private": False},
        "repos": rp, "events": [],
        "latest_push": {"repo": rp[0]["name"], "at": rp[0]["pushed_at"]} if rp else None,
    },
    "leetcode": {
        "handle": "pranavbairy2", "url": "https://leetcode.com/u/pranavbairy2/",
        "ranking": 693904, "solved_total": 237,  # total from your profile; language counts below overlap
        "languages": [{"name": "C++", "solved": 202}, {"name": "Python3", "solved": 24}, {"name": "C", "solved": 20}],
        "badges": ["50 Days Badge 2025", "50 Days Badge 2026"],
        "contest": None, "contests": [],
    },
    "codeforces": None,
    "codechef": {
        "handle": "bp28", "url": "https://www.codechef.com/users/bp28",
        "rating": 1218, "max_rating": 1218, "stars": 1, "global_rank": 82654, "country_rank": 79201,
        "solved_total": 110, "attended": 4,
        "contests": [
            {"title": "Weekend Dev Challenge 09: ML Projects", "at": None, "rank": None, "rating": None, "solved": 1},
            {"title": "Starters 219 (Rated)", "at": None, "rank": None, "rating": None, "solved": 2},
            {"title": "Starters 220 (Rated)", "at": None, "rank": None, "rating": None, "solved": 3},
            {"title": "Starters 221", "at": None, "rank": None, "rating": None, "solved": 3},
            {"title": "Starters 223 (Unrated)", "at": None, "rank": None, "rating": None, "solved": 2},
            {"title": "Starters 224 (Rated)", "at": "2026-02-04T16:30:06Z", "rank": 5066, "rating": 1218, "delta": 101, "solved": 4},
        ],
    },
}

out = os.path.join(ROOT, "assets", "data", "snapshot.js")
with open(out, "w", encoding="utf8") as f:
    f.write("/* Baked fallback. Replaced at runtime by the daily snapshot from Appwrite. */\n")
    f.write("window.__SNAPSHOT__ = " + json.dumps(snap, separators=(",", ":")) + ";\n")
print("wrote", out, "| contributions:", cal["total"], "| repos:", len(rp))
