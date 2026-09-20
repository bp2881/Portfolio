"""CodeChef has no public API, so this reads the profile page. Best effort:
each field is parsed on its own, so one that fails never takes the others down,
and the merge step keeps the previous good value for anything missing."""
import datetime as dt
import json
import re

from . import http


def _first(pattern, page, flags=re.S | re.I):
    m = re.search(pattern, page, flags)
    return m.group(1).strip() if m else None


def _int(v):
    """Accepts numbers or strings such as "5,066" or "1218"."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    digits = re.sub(r"[^\d]", "", str(v))
    return int(digits) if digits else None


def _ist_to_utc(text):
    """CodeChef prints times in IST, e.g. "2026-02-04 22:00:06"."""
    try:
        t = dt.datetime.strptime(str(text)[:19], "%Y-%m-%d %H:%M:%S") - dt.timedelta(hours=5, minutes=30)
        return t.strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None


def _try(fn):
    try:
        return fn()
    except Exception:  # noqa: BLE001 - one bad field must not sink the rest
        return None


def _stars(page):
    block = _first(r'class="rating-star"[^>]*>(.*?)</div>', page)
    return re.sub(r"<[^>]+>", "", block).count("\u2605") if block else None


def _contests(page):
    raw = _first(r"var all_rating\s*=\s*(\[.*?\]);", page)
    out = []
    for r in json.loads(raw) if raw else []:
        if not r.get("name"):
            continue
        out.append({
            "title": r["name"],
            "at": _ist_to_utc(r.get("end_date") or ""),
            "rank": _int(r.get("rank")),
            "rating": _int(r.get("rating")),
        })
    return out


def _daily(page):
    raw = _first(r"userDailySubmissionsStats\s*=\s*(\[.*?\]);", page)
    out = {}
    for r in json.loads(raw) if raw else []:
        y, m, d = str(r.get("date", "")).split("-")
        out[f"{int(y):04d}-{int(m):02d}-{int(d):02d}"] = int(r.get("value") or 0)
    return out


def parse_profile(page, handle):
    out = {"handle": handle, "url": f"https://www.codechef.com/users/{handle}"}
    out["rating"] = _try(lambda: _int(_first(r'class="rating-number"[^>]*>\s*(\d+)', page)))
    out["stars"] = _try(lambda: _stars(page))
    out["max_rating"] = _try(lambda: _int(_first(r"Highest Rating\s*(\d+)", page)))
    out["global_rank"] = _try(lambda: _int(_first(r"<strong>\s*([\d,]+)\s*</strong>\s*Global Rank", page)))
    out["country_rank"] = _try(lambda: _int(_first(r"<strong>\s*([\d,]+)\s*</strong>\s*Country Rank", page)))
    out["solved_total"] = _try(lambda: _int(_first(r"Total Problems Solved:\s*(\d+)", page)))
    out["attended"] = _try(lambda: _int(_first(r"No\. of Contests Participated:\s*(?:<[^>]+>\s*)*(\d+)", page)))
    out["contests"] = _try(lambda: _contests(page))
    out["daily"] = _try(lambda: _daily(page))
    return {k: v for k, v in out.items() if v not in (None, 0, [], {}, "")}


def fetch(handle):
    return parse_profile(http.request(f"https://www.codechef.com/users/{handle}"), handle)
