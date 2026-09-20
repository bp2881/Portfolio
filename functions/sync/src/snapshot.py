"""Builds the daily snapshot. A failed source never blanks the site: the last
good data is kept and marked stale, so the page can say so honestly."""
import datetime as dt
import os

from sources import codechef, codeforces, github, leetcode


def load_config(env=os.environ):
    return {
        "github_login": env.get("GITHUB_LOGIN", "bp2881"),
        "gh_token": env.get("GH_TOKEN") or None,
        "leetcode_user": env.get("LEETCODE_USER", "pranavbairy2"),
        "codeforces_handle": env.get("CODEFORCES_HANDLE", "pranavbairy"),
        "codechef_handle": env.get("CODECHEF_HANDLE", "bp28"),
        "solution_repos": [r.strip() for r in env.get("SOLUTION_REPOS", "").split(",") if r.strip()],
        "bucket_id": env.get("BUCKET_ID", "portfolio"),
        "file_id": env.get("SNAPSHOT_FILE_ID", "snapshot"),
    }


def sources(cfg):
    return {
        "github": lambda: github.fetch(cfg["github_login"], cfg["gh_token"], cfg["solution_repos"]),
        "leetcode": lambda: leetcode.fetch(cfg["leetcode_user"]),
        "codeforces": lambda: codeforces.fetch(cfg["codeforces_handle"]),
        "codechef": lambda: codechef.fetch(cfg["codechef_handle"]),
    }


# Sources scraped from HTML: keep old fields when a parse only finds some of them.
PARTIAL_MERGE = {"codechef"}


def build_snapshot(cfg, prev=None, log=print, now=None, fetchers=None):
    now = now or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    prev = prev or {}
    snap = {"schema": 1, "generated_at": now, "sources": {}}
    for name, fetch in (fetchers or sources(cfg)).items():
        old = prev.get(name)
        old_meta = (prev.get("sources") or {}).get(name, {})
        try:
            data = fetch()
            if name in PARTIAL_MERGE and isinstance(old, dict) and isinstance(data, dict):
                data = {**old, **data}
            snap[name] = data
            snap["sources"][name] = {"ok": True, "fetched_at": now, "stale": False}
            log(f"{name}: ok")
        except Exception as exc:  # noqa: BLE001 - any failure must be contained per source
            msg = f"{type(exc).__name__}: {exc}"[:200]
            log(f"{name}: failed, {msg}")
            snap[name] = old
            snap["sources"][name] = {
                "ok": False,
                "stale": old is not None,
                "fetched_at": old_meta.get("fetched_at"),
                "error": msg,
            }
    return snap
