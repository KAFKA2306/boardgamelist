from __future__ import annotations

import unittest

from scripts.summarize_playtest_reports import aggregate, render_markdown, validate_report


def report(session_id: str, completed: bool = True, version: str = "0.4.0") -> dict:
    return {
        "version": version,
        "sessionId": session_id,
        "sessionStartedAt": "2026-09-01T00:00:00+00:00",
        "gameStartedAt": "2026-09-01T00:05:00+00:00",
        "endedAt": "2026-09-01T00:35:00+00:00" if completed else None,
        "completed": completed,
        "survey": {
            "ruleUnderstanding": 4,
            "fun": 5,
            "tempo": 3,
            "replayIntent": 4,
            "comment": "手番が分かりやすかった",
            "submittedAt": "2026-09-01T00:36:00+00:00",
        },
    }


class PlaytestReportSummaryTests(unittest.TestCase):
    def test_aggregate_uses_only_supplied_session_data(self) -> None:
        summary = aggregate([report("s1"), report("s2", completed=False)])
        self.assertEqual(summary["report_version"], "0.4.0")
        self.assertEqual(summary["sessions"], 2)
        self.assertEqual(summary["completed"], 1)
        self.assertEqual(summary["completion_rate"], 0.5)
        self.assertEqual(summary["ratings"]["fun"], {"responses": 2, "average": 5})
        self.assertEqual(summary["completed_duration_minutes"], {"observations": 1, "average": 30})
        self.assertIn("完走率: 50.0%", render_markdown(summary))

    def test_mixed_versions_fail_loudly(self) -> None:
        with self.assertRaisesRegex(ValueError, "mixed report versions"):
            aggregate([report("s1"), report("s2", version="0.5.0")])

    def test_invalid_rating_fails_loudly(self) -> None:
        bad = report("bad")
        bad["survey"]["replayIntent"] = 6
        with self.assertRaisesRegex(ValueError, "replayIntent"):
            validate_report(bad, "fixture")

    def test_missing_required_field_fails_loudly(self) -> None:
        bad = report("bad")
        del bad["completed"]
        with self.assertRaisesRegex(ValueError, "completed"):
            validate_report(bad, "fixture")


if __name__ == "__main__":
    unittest.main()
