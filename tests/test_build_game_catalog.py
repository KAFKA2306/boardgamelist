from __future__ import annotations

import csv
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from build_game_catalog import build


FRONT_MATTER = """---
title: "Sky Team"
japanese_title: "スカイチーム"
players: "2"
playtime: "20 min"
complexity: 2.05
bgg_id: 373106
bgg_rating: 8.16
tags: [cooperative, dice-rolling]
mechanics: [cooperative_play, dice_rolling]
themes: [aviation]
ownership: true
bga_available: true
---
# Sky Team
"""


class CatalogBuilderTests(unittest.TestCase):
    def test_builds_locale_aware_catalog_and_checksums(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            games = root / "docs" / "games"
            (games / "ja").mkdir(parents=True)
            (games / "sky-team.md").write_text(FRONT_MATTER, encoding="utf-8")
            (games / "ja" / "sky-team.md").write_text(FRONT_MATTER, encoding="utf-8")
            output = root / "docs" / "api" / "v1"
            manifest = build(games, output)

            self.assertEqual(manifest["game_count"], 1)
            catalog = json.loads((output / "games.json").read_text(encoding="utf-8"))
            self.assertEqual(catalog["games"][0]["players"]["min"], 2)
            self.assertEqual(catalog["games"][0]["players"]["max"], 2)
            self.assertEqual(catalog["games"][0]["locales"], ["en", "ja"])
            self.assertIn("bgg-rating-observation-date-missing", catalog["games"][0]["quality_flags"])

            payload = (output / "games.json").read_bytes()
            self.assertEqual(manifest["files"]["games.json"]["sha256"], hashlib.sha256(payload).hexdigest())
            with (output / "games.csv").open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["bgg_id"], "373106")

    def test_rejects_duplicate_bgg_id_across_canonical_games(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            games = root / "docs" / "games"
            games.mkdir(parents=True)
            (games / "a.md").write_text(FRONT_MATTER, encoding="utf-8")
            (games / "b.md").write_text(FRONT_MATTER.replace('title: "Sky Team"', 'title: "Other"'), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate BGG id"):
                build(games, root / "out")


if __name__ == "__main__":
    unittest.main()
