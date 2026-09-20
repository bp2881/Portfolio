import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sources import codechef, codeforces, http, leetcode  # noqa: E402


def test_codeforces_shapes(monkeypatch):
    def fake(url, **kw):
        if "user.info" in url:
            return {"status": "OK", "result": [{"rating": 1010, "maxRating": 1050, "rank": "newbie", "maxRank": "newbie"}]}
        if "user.rating" in url:
            return {"status": "OK", "result": [
                {"contestName": "Round 1", "rank": 5000, "oldRating": 0, "newRating": 900, "ratingUpdateTimeSeconds": 1750000000},
                {"contestName": "Round 2", "rank": 3000, "oldRating": 900, "newRating": 1010, "ratingUpdateTimeSeconds": 1751000000}]}
        return {"status": "OK", "result": [
            {"verdict": "OK", "creationTimeSeconds": 1750000000, "problem": {"contestId": 1, "index": "A"}},
            {"verdict": "OK", "creationTimeSeconds": 1750000100, "problem": {"contestId": 1, "index": "A"}},
            {"verdict": "WRONG_ANSWER", "creationTimeSeconds": 1750100000, "problem": {"contestId": 1, "index": "B"}}]}
    monkeypatch.setattr(http, "get_json", fake)
    out = codeforces.fetch("h")
    assert out["rating"] == 1010 and out["attended"] == 2 and out["solved_total"] == 1
    assert out["contests"][1]["rating"] == 1010 and out["contests"][0]["at"].endswith("Z")
    assert sum(out["daily"].values()) == 3


def test_leetcode_shapes(monkeypatch):
    def fake(url, payload, **kw):
        q = payload["query"]
        if "matchedUser" in q:
            return {"data": {"matchedUser": {"profile": {"ranking": 5},
                    "languageProblemCount": [{"languageName": "C++", "problemsSolved": 9}],
                    "submitStatsGlobal": {"acSubmissionNum": [{"difficulty": "All", "count": 9}, {"difficulty": "Easy", "count": 4}]},
                    "badges": [{"displayName": "50 Days Badge 2025"}]}}}
        return {"data": {"userContestRanking": {"attendedContestsCount": 1, "rating": 1500.4, "globalRanking": 100, "totalParticipants": 9000, "topPercentage": 1.1},
                "userContestRankingHistory": [
                    {"attended": False, "contest": {"title": "skipped", "startTime": 1}},
                    {"attended": True, "problemsSolved": 3, "totalProblems": 4, "rating": 1500.4, "ranking": 100,
                     "contest": {"title": "Weekly 1", "startTime": 1750000000}}]}}
    monkeypatch.setattr(http, "post_json", fake)
    out = leetcode.fetch("u")
    assert out["solved_total"] == 9 and out["contest"]["rating"] == 1500
    assert len(out["contests"]) == 1 and out["contests"][0]["solved"] == 3


def test_codechef_parse_is_partial_and_safe():
    html = '<div class="rating-number">1234</div> <strong>99</strong> Global Rank Highest Rating 1300 Total Problems Solved: 42'
    out = codechef.parse_profile(html, "x")
    assert out["rating"] == 1234 and out["global_rank"] == 99 and out["max_rating"] == 1300 and out["solved_total"] == 42
    assert "contests" not in out  # nothing to parse, nothing invented
    assert codechef.parse_profile("<html></html>", "x") == {"handle": "x", "url": "https://www.codechef.com/users/x"}


def test_daily_activity_shapes(monkeypatch):
    import json as _json

    def fake_gql(query, username):
        return {"matchedUser": {"userCalendar": {"submissionCalendar": _json.dumps({"1750032000": 3, "1750118400": 1})}}}
    monkeypatch.setattr(leetcode, "_gql", fake_gql)
    d = leetcode._daily("u")
    assert sum(d.values()) == 4 and all(len(k) == 10 for k in d)

    html = 'var userDailySubmissionsStats = [{"date":"2026-1-4","value":"3"},{"date":"2026-12-25","value":2}];'
    assert codechef.parse_profile(html, "x")["daily"] == {"2026-01-04": 3, "2026-12-25": 2}


def test_leetcode_errors_are_loud_not_empty(monkeypatch):
    import pytest
    # blocked or wrong handle: must raise so the last good data is kept
    monkeypatch.setattr(http, "post_json", lambda *a, **k: {"data": {"matchedUser": None}})
    with pytest.raises(RuntimeError):
        leetcode.fetch("nobody")
    monkeypatch.setattr(http, "post_json", lambda *a, **k: {"errors": [{"message": "forbidden"}], "data": None})
    with pytest.raises(RuntimeError):
        leetcode.fetch("nobody")


def test_solution_repo_commits_counted_per_day(monkeypatch):
    from sources import github
    pages = {1: [{"commit": {"author": {"date": "2026-09-01T10:00:00Z"}}}] * 100,
             2: [{"commit": {"author": {"date": "2026-09-02T10:00:00Z"}}}] * 3}
    monkeypatch.setattr(http, "get_json", lambda url, **k: pages[int(url.rsplit("page=", 1)[1])])
    assert github.solutions_daily("me", ["me/leetcode"]) == {"2026-09-01": 100, "2026-09-02": 3}


def test_codechef_handles_numbers_and_strings_and_isolates_failures():
    # the real page mixes ints and strings; this used to raise TypeError and lose everything
    page = (
        '<div class="rating-number">1218</div><div class="rating-star"><span>\u2605</span></div>'
        '<strong>82,654</strong> Global Rank Total Problems Solved: 110 '
        'var all_rating = [{"name":"Starters 224","end_date":"2026-02-04 22:00:06","rank":5066,"rating":"1218"},'
        '{"name":"Starters 220","end_date":"2026-01-07 22:00:00","rank":"7000","rating":1117}]; '
        'var userDailySubmissionsStats = [{"date":"2026-2-4","value":3},{"date":"2026-2-5","value":"2"}];'
    )
    out = codechef.parse_profile(page, "bp28")
    assert out["rating"] == 1218 and out["stars"] == 1 and out["global_rank"] == 82654
    assert [c["rank"] for c in out["contests"]] == [5066, 7000]
    assert out["contests"][0]["at"] == "2026-02-04T16:30:06Z"
    assert out["daily"] == {"2026-02-04": 3, "2026-02-05": 2}

    # a broken contest block must not lose the rest
    broken = page.replace("var all_rating = [", "var all_rating = [{{")
    out = codechef.parse_profile(broken, "bp28")
    assert out["rating"] == 1218 and "contests" not in out and out["daily"]
