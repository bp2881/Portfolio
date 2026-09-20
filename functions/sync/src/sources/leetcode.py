"""LeetCode via the GraphQL endpoint its own website uses (unofficial, may change).

Every failure raises with the reason instead of returning empty data, so the
sync can keep the last good values and say why."""
import datetime as dt
import json

from . import http

URL = "https://leetcode.com/graphql/"

Q_PROFILE = """
query($u: String!) {
  matchedUser(username: $u) {
    profile { ranking }
    languageProblemCount { languageName problemsSolved }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    badges { displayName }
  }
}"""

Q_CONTEST = """
query($u: String!) {
  userContestRanking(username: $u) {
    attendedContestsCount rating globalRanking totalParticipants topPercentage
  }
  userContestRankingHistory(username: $u) {
    attended problemsSolved totalProblems rating ranking
    contest { title startTime }
  }
}"""

Q_CALENDAR = """
query($u: String!) {
  matchedUser(username: $u) { userCalendar { submissionCalendar } }
}"""


def _gql(query, username):
    reply = http.post_json(
        URL, {"query": query, "variables": {"u": username}},
        headers={
            "Referer": f"https://leetcode.com/u/{username}/",
            "Origin": "https://leetcode.com",
            "Accept": "application/json",
        },
    )
    if reply.get("errors") and not reply.get("data"):
        raise RuntimeError("LeetCode GraphQL: " + str(reply["errors"])[:200])
    return reply.get("data") or {}


def _daily(username):
    """Submissions per UTC day for the last year, as {"YYYY-MM-DD": count}."""
    try:
        raw = ((_gql(Q_CALENDAR, username).get("matchedUser") or {}).get("userCalendar") or {}).get("submissionCalendar")
        cal = json.loads(raw) if raw else {}
    except Exception:  # noqa: BLE001 - the calendar is optional
        return {}
    return {
        dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).strftime("%Y-%m-%d"): int(n)
        for ts, n in cal.items()
    }


def fetch(username):
    prof = _gql(Q_PROFILE, username).get("matchedUser")
    if not prof:
        raise RuntimeError(f"LeetCode returned no profile for '{username}' (wrong handle, or the request was blocked)")
    contest = _gql(Q_CONTEST, username)
    ranking = contest.get("userContestRanking")
    history = contest.get("userContestRankingHistory") or []

    solved = {r["difficulty"]: r["count"] for r in (prof.get("submitStatsGlobal") or {}).get("acSubmissionNum", [])}
    contests = []
    for h in history:
        if not h.get("attended"):
            continue
        c = h["contest"]
        contests.append({
            "title": c["title"],
            "at": dt.datetime.fromtimestamp(c["startTime"], dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "rank": h.get("ranking"),
            "rating": round(h["rating"]) if h.get("rating") is not None else None,
            "solved": h.get("problemsSolved"),
            "of": h.get("totalProblems"),
        })
    contests.sort(key=lambda c: c["at"])

    return {
        "handle": username,
        "url": f"https://leetcode.com/u/{username}/",
        "ranking": (prof.get("profile") or {}).get("ranking"),
        "solved_total": solved.get("All"),
        "solved_by_difficulty": {k: v for k, v in solved.items() if k != "All"},
        "languages": [{"name": l["languageName"], "solved": l["problemsSolved"]}
                      for l in prof.get("languageProblemCount") or []],
        "badges": [b["displayName"] for b in prof.get("badges") or []],
        "contest": None if not ranking else {
            "rating": round(ranking["rating"]),
            "global_rank": ranking["globalRanking"],
            "participants": ranking["totalParticipants"],
            "top_percent": ranking["topPercentage"],
            "attended": ranking["attendedContestsCount"],
        },
        "contests": contests,
        "daily": _daily(username),
    }
