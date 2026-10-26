"""Contract tests for production read-back, including stale and corrupt data."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.verify_deployed_game_chooser import verify


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class ReadbackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.site = Path(self.tmp.name)
        (self.site / "api/v1").mkdir(parents=True)
        (self.site / "games/ja").mkdir(parents=True)
        self.chooser = b"<main id='game-chooser'>chooser</main>"
        self.games = b'{"version":1,"count":1,"games":[{"id":"game:a"}]}'
        self.manifest = json.dumps({"files": {"games.json": {
            "sha256": sha(self.games), "bytes": len(self.games),
        }}}).encode()
        (self.site / "api/v1/manifest.json").write_bytes(self.manifest)
        (self.site / "games/ja/index.html").write_bytes(self.chooser)

    def _fetcher(self, overrides=None):
        data = {"chooser": self.chooser, "games": self.games, "manifest": self.manifest}
        data.update(overrides or {})
        def fake(url, timeout, cache_key):
            if url.endswith("/games/ja/"):
                return data["chooser"]
            return data["manifest"] if url.endswith("manifest.json") else data["games"]
        return fake

    def test_current_publication_passes(self):
        result = verify(self.site, attempts=1, fetcher=self._fetcher())
        self.assertEqual(result["game_count"], 1)
        self.assertEqual(result["attempt"], 1)

    def test_stale_manifest_fails_after_bounded_retry(self):
        calls = []
        def stale(url, timeout, cache_key):
            calls.append((url, cache_key))
            return self._fetcher({"manifest": b'{"files":{}}'})(url, timeout, cache_key)
        with self.assertRaisesRegex(RuntimeError, "after 2 attempts"):
            verify(self.site, attempts=2, interval=0, fetcher=stale, sleeper=lambda _: None)
        self.assertEqual(len(calls), 6)

    def test_manifest_catalog_mismatch_fails(self):
        with self.assertRaisesRegex(RuntimeError, "catalog digest"):
            verify(self.site, attempts=1, fetcher=self._fetcher({"games": b'{"version":1,"count":0,"games":[]}'}))

    def test_missing_chooser_marker_fails(self):
        replacement = b"<main>missing marker</main>"
        (self.site / "games/ja/index.html").write_bytes(replacement)
        with self.assertRaisesRegex(RuntimeError, "marker missing"):
            verify(self.site, attempts=1, fetcher=self._fetcher({"chooser": replacement}))


if __name__ == "__main__":
    unittest.main()
