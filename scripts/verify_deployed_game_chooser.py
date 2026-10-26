#!/usr/bin/env python3
"""Verify GitHub Pages serves the just-built Game Chooser and catalog."""
from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path
from typing import Callable

BASE_URL = "https://kafka2306.github.io/boardgamelist"


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def fetch(url: str, timeout: int, cache_key: str) -> bytes:
    request = urllib.request.Request(
        f"{url}?readback={cache_key}",
        headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError(f"{url}: HTTP {response.status}")
        return response.read()


def verify(
    site: Path,
    base_url: str = BASE_URL,
    attempts: int = 8,
    interval: float = 10,
    timeout: int = 8,
    fetcher: Callable[[str, int, str], bytes] = fetch,
    sleeper: Callable[[float], None] = time.sleep,
) -> dict[str, object]:
    if attempts < 1 or interval < 0 or timeout < 1:
        raise ValueError("attempts/timeout must be positive; interval must be nonnegative")
    expected_manifest = (site / "api/v1/manifest.json").read_bytes()
    expected_chooser = (site / "games/ja/index.html").read_bytes()
    base = base_url.rstrip("/")
    urls = {
        "chooser": f"{base}/games/ja/",
        "games": f"{base}/api/v1/games.json",
        "manifest": f"{base}/api/v1/manifest.json",
    }
    last_error = "not attempted"
    for attempt in range(1, attempts + 1):
        try:
            cache_key = f"{digest(expected_manifest)[:12]}-{attempt}"
            live = {name: fetcher(url, timeout, cache_key) for name, url in urls.items()}
            if digest(live["manifest"]) != digest(expected_manifest):
                raise ValueError("live manifest differs from this build")
            if digest(live["chooser"]) != digest(expected_chooser):
                raise ValueError("live chooser differs from this build")
            if b"game-chooser" not in live["chooser"]:
                raise ValueError("Game Chooser marker missing")
            catalog = json.loads(live["games"])
            manifest = json.loads(live["manifest"])
            if catalog.get("version") != 1 or not isinstance(catalog.get("games"), list):
                raise ValueError("catalog version or games array invalid")
            if catalog.get("count") != len(catalog["games"]):
                raise ValueError("catalog count mismatch")
            meta = manifest.get("files", {}).get("games.json", {})
            if meta.get("sha256") != digest(live["games"]):
                raise ValueError("live catalog digest differs from live manifest")
            if meta.get("bytes") != len(live["games"]):
                raise ValueError("live catalog byte count differs from live manifest")
            return {
                "attempt": attempt,
                "game_count": len(catalog["games"]),
                "manifest_sha256": digest(live["manifest"]),
                "chooser_sha256": digest(live["chooser"]),
                "games_sha256": digest(live["games"]),
                "urls": urls,
            }
        except (OSError, RuntimeError, ValueError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            print(f"production read-back {attempt}/{attempts} not converged: {last_error}", flush=True)
            if attempt < attempts:
                sleeper(interval)
    raise RuntimeError(f"production read-back failed after {attempts} attempts: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=Path("site"))
    parser.add_argument("--attempts", type=int, default=8)
    parser.add_argument("--interval", type=float, default=10)
    parser.add_argument("--timeout", type=int, default=8)
    args = parser.parse_args()
    try:
        result = verify(args.site, attempts=args.attempts, interval=args.interval, timeout=args.timeout)
    except (OSError, ValueError, RuntimeError) as exc:
        parser.exit(1, f"{exc}\n")
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
