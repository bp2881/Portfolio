"""Codeforces via the official public API."""
import datetime as dt

from . import http

API = "https://codeforces.com/api/"


def _call(method, **params):
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    data = http.get_json(f"{API}{method}?{qs}")
    if data.get("status") != "OK":
        raise RuntimeError(data.get("comment", "codeforces api error"))
    return data["result"]


def fetch(handle):
    info = _call("user.info", handles=handle)[0]
    history = _call("user.rating", handle=handle)
    solved, daily = set(), {}
    try:
        for sub in _call("user.status", handle=handle, **{"from": 1, "count": 100000}):
            day = dt.datetime.fromtimestamp(sub["creationTimeSeconds"], dt.timezone.utc).strftime("%Y-%m-%d")
            daily[day] = daily.get(day, 0) + 1
            if sub.get("verdict") == "OK":
                p = sub["problem"]
                solved.add((p.get("contestId"), p.get("index")))
    except Exception:
        solved = None  # solved count and daily activity are optional

    contests = [{
        "title": h["contestName"],
        "at": dt.datetime.fromtimestamp(h["ratingUpdateTimeSeconds"], dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "rank": h["rank"],
        "old": h["oldRating"],
        "rating": h["newRating"],
    } for h in history]

    return {
        "handle": handle,
        "url": f"https://codeforces.com/profile/{handle}",
        "rating": info.get("rating"),
        "max_rating": info.get("maxRating"),
        "rank_title": info.get("rank"),
        "max_rank_title": info.get("maxRank"),
        "solved_total": len(solved) if solved is not None else None,
        "attended": len(contests),
        "contests": contests,
        "daily": daily,
    }
