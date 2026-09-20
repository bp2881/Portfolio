import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from snapshot import build_snapshot  # noqa: E402
from sources import github  # noqa: E402

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "github_contributions.html")
CFG = {}


def test_calendar_parse():
    cal = github.parse_calendar_html(open(FIX, encoding="utf8").read())
    assert 360 <= len(cal["days"]) <= 372
    assert all(len(d) == 3 for d in cal["days"])
    assert all(0 <= d[2] <= 4 for d in cal["days"])
    assert cal["total"] == sum(d[1] for d in cal["days"])
    assert cal["total"] > 0
    assert cal["days"] == sorted(cal["days"], key=lambda d: d[0])


def test_failed_source_keeps_last_good_and_marks_stale():
    prev = {"schema": 1, "generated_at": "2026-09-18T00:00:00Z",
            "leetcode": {"ranking": 1},
            "sources": {"leetcode": {"ok": True, "fetched_at": "2026-09-18T00:00:00Z", "stale": False}}}

    def boom():
        raise RuntimeError("blocked")

    snap = build_snapshot(CFG, prev, log=lambda m: None, now="2026-09-19T00:00:00Z",
                          fetchers={"leetcode": boom, "codechef": lambda: {"rating": 1218}})
    assert snap["leetcode"] == {"ranking": 1}
    assert snap["sources"]["leetcode"]["stale"] is True
    assert snap["sources"]["leetcode"]["fetched_at"] == "2026-09-18T00:00:00Z"
    assert snap["sources"]["codechef"] == {"ok": True, "fetched_at": "2026-09-19T00:00:00Z", "stale": False}


def test_first_run_failure_is_not_marked_stale():
    def boom():
        raise RuntimeError("blocked")

    snap = build_snapshot(CFG, None, log=lambda m: None, fetchers={"codeforces": boom})
    assert snap["codeforces"] is None
    assert snap["sources"]["codeforces"]["stale"] is False
    assert snap["sources"]["codeforces"]["fetched_at"] is None


def test_codechef_partial_parse_keeps_old_fields():
    prev = {"codechef": {"rating": 1218, "solved_total": 110},
            "sources": {"codechef": {"ok": True, "fetched_at": "x", "stale": False}}}
    snap = build_snapshot(CFG, prev, log=lambda m: None, fetchers={"codechef": lambda: {"rating": 1230}})
    assert snap["codechef"] == {"rating": 1230, "solved_total": 110}
