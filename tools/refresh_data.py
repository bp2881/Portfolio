"""Refresh assets/data/snapshot.js from the live sites.

Run it on your own computer (or let the GitHub Action do it) and the site shows
real LeetCode, Codeforces, CodeChef and GitHub data without any backend:

    python tools/refresh_data.py            refresh the data
    python tools/refresh_data.py --serve    refresh, then open the site at http://localhost:8000

Optional environment variables:
    GH_TOKEN        classic token with read:user, adds private contribution counts
    SOLUTION_REPOS  comma separated owner/repo list whose commits count as solved problems
    LEETCODE_USER, CODEFORCES_HANDLE, CODECHEF_HANDLE, GITHUB_LOGIN  (defaults are yours)

If a site refuses the request, the reason is printed and that source keeps its
last good data, marked stale.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "functions", "sync", "src"))
from snapshot import build_snapshot, load_config  # noqa: E402

OUT = os.path.join(ROOT, "assets", "data", "snapshot.js")


def read_previous():
    try:
        text = open(OUT, encoding="utf8").read()
        return json.loads(text.split("=", 1)[1].strip().rstrip(";"))
    except Exception:  # noqa: BLE001
        return None


def summary(name, d):
    if not d:
        return "no data"
    if name == "github":
        cal = d.get("calendar") or {}
        extra = f", solution days {len(d['solutions']['daily'])}" if d.get("solutions") else ""
        return f"{cal.get('total')} contributions, {len(d.get('repos', []))} repos{extra}"
    bits = []
    if d.get("solved_total") is not None:
        bits.append(f"solved {d['solved_total']}")
    if d.get("rating") is not None:
        bits.append(f"rating {d['rating']}")
    elif d.get("contest"):
        bits.append(f"rating {d['contest']['rating']}")
    bits.append(f"{len(d.get('contests') or [])} contests")
    bits.append(f"{len(d.get('daily') or {})} active days")
    return ", ".join(bits)


if __name__ == "__main__":
    snap = build_snapshot(load_config(), read_previous(), log=lambda m: print("  " + m))
    with open(OUT, "w", encoding="utf8") as f:
        f.write("/* Refreshed by tools/refresh_data.py. Replaced at runtime by the daily snapshot from Appwrite. */\n")
        f.write("window.__SNAPSHOT__ = " + json.dumps(snap, separators=(",", ":")) + ";\n")
    print("\nWrote", OUT)
    for name, meta in snap["sources"].items():
        state = "ok" if meta.get("ok") else ("STALE" if meta.get("stale") else "FAILED")
        print(f"  {name:11} {state:7} {summary(name, snap.get(name))}")
        if meta.get("error"):
            print(f"              reason: {meta['error']}")
        elif name != "github" and snap.get(name) and not snap[name].get("daily"):
            print("              note: no daily activity was found for this site, so it adds nothing to the activity grid")
    if "--serve" in sys.argv:
        import functools
        import http.server
        import socketserver
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
        with socketserver.TCPServer(("", 8000), handler) as srv:
            print("\nServing http://localhost:8000  (Ctrl+C to stop)")
            try:
                srv.serve_forever()
            except KeyboardInterrupt:
                pass
