from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.audit_game_metadata import audit, parse_front_matter


class MetadataAuditTests(unittest.TestCase):
    def test_parse_top_level_front_matter(self) -> None:
        parsed = parse_front_matter('---\ntitle: "Example"\nbgg_id: 42\ntags: [family, cards]\n---\n# Body\n')
        self.assertEqual(parsed["title"], "Example")
        self.assertEqual(parsed["bgg_id"], 42)
        self.assertEqual(parsed["tags"], ["family", "cards"])

    def test_valid_record_has_no_errors(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "game.md"
            path.write_text('---\ntitle: Game\nplayers: "2-4"\nplaytime: "45 min"\nbgg_id: 7\nbgg_rating: 8.1\ncomplexity: 2.5\n---\n', encoding="utf-8")
            result = audit([path])
        self.assertEqual(result["summary"]["errors"], 0)
        self.assertEqual(result["summary"]["records_indexed"], 1)
        self.assertEqual(len(result["records"][0]["sha256"]), 64)

    def test_duplicate_id_and_invalid_range_fail(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            for name, players in (("a.md", "4-2"), ("b.md", "2-4")):
                path = Path(directory) / name
                path.write_text(f'---\ntitle: {name}\nplayers: "{players}"\nplaytime: "30 min"\nbgg_id: 99\n---\n', encoding="utf-8")
                paths.append(path)
            result = audit(paths)
        codes = [issue["code"] for issue in result["issues"] if issue["severity"] == "error"]
        self.assertIn("invalid-players", codes)
        self.assertEqual(codes.count("duplicate-bgg-id"), 2)


if __name__ == "__main__":
    unittest.main()
