"""GitHub: repos, recent public events and the contribution calendar.

With GH_TOKEN (a token that can read your profile) the calendar comes from the
GraphQL API and includes private contribution counts, provided the profile
setting "Private contributions" is on. Without a token it falls back to the
public calendar page, which only counts public activity.
"""
import datetime as dt
import html as htmllib
import re

from . import http

LEVELS = {
    "NONE": 0,
    "FIRST_QUARTILE": 1,
    "SECOND_QUARTILE": 2,
    "THIRD_QUARTILE": 3,
    "FOURTH_QUARTILE": 4,
}

GQL = """
query($login: String!) {
  user(login: $login) {
    login name followers { totalCount }
    repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER,
                 orderBy: {field: PUSHED_AT, direction: DESC}) {
      totalCount
      nodes { name description url isFork isArchived stargazerCount pushedAt
              primaryLanguage { name } }
    }
    contributionsCollection {
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}
"""


def _attrs(tag):
    return dict(re.findall(r'([\w-]+)="([^"]*)"', tag))


def parse_calendar_html(page):
    """Parse github.com/users/<login>/contributions into [[date, count, level], ...]."""
    counts = {}
    for m in re.finditer(r"<tool-tip\b([^>]*)>([^<]*)</tool-tip>", page):
        target = _attrs(m.group(1)).get("for")
        text = htmllib.unescape(m.group(2)).strip()
        n = re.match(r"(\d[\d,]*)\s+contribution", text)
        counts[target] = int(n.group(1).replace(",", "")) if n else 0
    days = []
    for m in re.finditer(r"<td\b[^>]*ContributionCalendar-day[^>]*>", page):
        a = _attrs(m.group(0))
        if "data-date" not in a:
            continue
        days.append([a["data-date"], counts.get(a.get("id"), 0), int(a.get("data-level", 0))])
    days.sort(key=lambda d: d[0])
    total = sum(d[1] for d in days)
    return {"total": total, "days": days}


def _summarize_event(e):
    kind, p = e.get("type", ""), e.get("payload", {}) or {}
    repo = (e.get("repo", {}).get("name") or "").split("/")[-1]
    at = e.get("created_at")
    if kind == "PushEvent":
        commits = p.get("commits") or []
        if commits:
            text = commits[-1].get("message", "").splitlines()[0]
        else:
            n = p.get("size") or 1
            text = f"pushed {n} commit" + ("s" if n != 1 else "")
        return {"at": at, "repo": repo, "kind": "push", "text": text}
    if kind == "CreateEvent":
        rt = p.get("ref_type")
        text = "created repository" if rt == "repository" else f"created {rt} {p.get('ref')}"
        return {"at": at, "repo": repo, "kind": "create", "text": text}
    if kind == "PullRequestEvent":
        pr = p.get("pull_request", {})
        return {"at": at, "repo": repo, "kind": "pull request",
                "text": f"{p.get('action')} pull request: {pr.get('title', '')}".strip()}
    if kind == "IssuesEvent":
        return {"at": at, "repo": repo, "kind": "issue",
                "text": f"{p.get('action')} issue: {p.get('issue', {}).get('title', '')}".strip()}
    if kind == "ReleaseEvent":
        return {"at": at, "repo": repo, "kind": "release",
                "text": f"released {p.get('release', {}).get('tag_name', '')}".strip()}
    if kind == "ForkEvent":
        return {"at": at, "repo": repo, "kind": "fork", "text": "forked"}
    if kind == "WatchEvent":
        return {"at": at, "repo": repo, "kind": "star", "text": "starred"}
    return None


def solutions_daily(login, repos, token=None, days=371):
    """Commits per UTC day across the given repos, as {"YYYY-MM-DD": count}.

    Meant for a repo that a browser extension such as LeetHub fills with one
    commit per solved problem. Private repos work with a token that can read
    them. Only counts are kept, never repo names or messages."""
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    hdr = {"Accept": "application/vnd.github+json"}
    if token:
        hdr["Authorization"] = f"Bearer {token}"
    daily = {}
    for repo in repos:
        for page in range(1, 11):
            batch = http.get_json(
                f"https://api.github.com/repos/{repo}/commits?author={login}&since={since}&per_page=100&page={page}",
                headers=hdr,
            )
            for c in batch:
                day = c["commit"]["author"]["date"][:10]
                daily[day] = daily.get(day, 0) + 1
            if len(batch) < 100:
                break
    return daily


def fetch(login, token=None, solution_repos=()):
    hdr = {"Accept": "application/vnd.github+json"}
    if token:
        hdr["Authorization"] = f"Bearer {token}"

    if token:
        data = http.post_json(
            "https://api.github.com/graphql",
            {"query": GQL, "variables": {"login": login}},
            headers=hdr,
        )
        if data.get("errors"):
            raise RuntimeError(str(data["errors"])[:300])
        u = data["data"]["user"]
        cal = u["contributionsCollection"]["contributionCalendar"]
        days = [
            [d["date"], d["contributionCount"], LEVELS.get(d["contributionLevel"], 0)]
            for w in cal["weeks"] for d in w["contributionDays"]
        ]
        private = u["contributionsCollection"]["restrictedContributionsCount"]
        calendar = {
            "total": cal["totalContributions"],
            "days": days,
            "private": private,
            "includes_private": private > 0,
        }
        repos = [
            {"name": r["name"], "description": r["description"], "url": r["url"],
             "language": (r["primaryLanguage"] or {}).get("name"),
             "pushed_at": r["pushedAt"], "stars": r["stargazerCount"], "fork": r["isFork"]}
            for r in u["repositories"]["nodes"] if not r["isArchived"]
        ]
        profile = {"login": u["login"], "name": u["name"],
                   "followers": u["followers"]["totalCount"],
                   "public_repos": u["repositories"]["totalCount"]}
    else:
        page = http.request(f"https://github.com/users/{login}/contributions")
        cal = parse_calendar_html(page)
        calendar = {"total": cal["total"], "days": cal["days"], "private": 0, "includes_private": False}
        raw = http.get_json(f"https://api.github.com/users/{login}/repos?per_page=100&sort=pushed", headers=hdr)
        repos = [
            {"name": r["name"], "description": r["description"], "url": r["html_url"],
             "language": r["language"], "pushed_at": r["pushed_at"],
             "stars": r["stargazers_count"], "fork": r["fork"]}
            for r in raw if not r.get("archived")
        ]
        profile = {"login": login, "name": None, "followers": None, "public_repos": len(repos)}

    raw_events = http.get_json(f"https://api.github.com/users/{login}/events/public?per_page=50", headers=hdr)
    events = [s for s in (_summarize_event(e) for e in raw_events) if s][:15]

    latest = next((e for e in events if e["kind"] == "push"), None)
    if latest:
        latest_push = {"repo": latest["repo"], "at": latest["at"]}
    elif repos:
        top = max(repos, key=lambda r: r["pushed_at"] or "")
        latest_push = {"repo": top["name"], "at": top["pushed_at"]}
    else:
        latest_push = None

    out = {**profile, "calendar": calendar, "repos": repos, "events": events, "latest_push": latest_push}
    if solution_repos:
        out["solutions"] = {"daily": solutions_daily(login, solution_repos, token)}
    return out
