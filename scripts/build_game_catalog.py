#!/usr/bin/env python3
"""Build a deterministic, versioned catalog API from canonical game guides."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from audit_game_metadata import parse_front_matter

PLAYER_RE = re.compile(r"^\s*(\d+)(?:\s*(?:-|–|〜|~)\s*(\d+))?\s*$")
TIME_RE = re.compile(r"^\s*(\d+)\s*(?:-|–|〜|~)?\s*(\d+)?\s*(?:min|mins|minutes|分)?\s*$", re.I)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _range(value: Any, pattern: re.Pattern[str]) -> tuple[int | None, int | None]:
    if value is None:
        return None, None
    match = pattern.fullmatch(str(value))
    if not match:
        return None, None
    low = int(match.group(1))
    high = int(match.group(2) or low)
    return low, high


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _record(path: Path, games_dir: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    metadata = parse_front_matter(raw.decode("utf-8"))
    if metadata is None:
        raise ValueError(f"missing front matter: {path}")
    players_min, players_max = _range(metadata.get("players"), PLAYER_RE)
    time_min, time_max = _range(metadata.get("playtime"), TIME_RE)
    slug = path.stem
    locales = ["en"]
    if (games_dir / "ja" / path.name).exists():
        locales.append("ja")
    bgg_id = metadata.get("bgg_id")
    rating = metadata.get("bgg_rating")
    quality_flags: list[str] = []
    if rating is not None:
        quality_flags.append("bgg-rating-observation-date-missing")
    if bgg_id is None:
        quality_flags.append("bgg-id-missing")

    return {
        "id": f"game:{slug}",
        "slug": slug,
        "title": metadata.get("title"),
        "japanese_title": metadata.get("japanese_title"),
        "players": {"min": players_min, "max": players_max, "source": metadata.get("players")},
        "playtime_minutes": {"min": time_min, "max": time_max, "source": metadata.get("playtime")},
        "complexity": metadata.get("complexity"),
        "bgg": {
            "id": bgg_id,
            "rating": rating,
            "rating_observed_at": None,
            "url": f"https://boardgamegeek.com/boardgame/{bgg_id}" if isinstance(bgg_id, int) else None,
        },
        "tags": _list(metadata.get("tags")),
        "mechanics": _list(metadata.get("mechanics")),
        "themes": _list(metadata.get("themes")),
        "game_type": metadata.get("game_type"),
        "player_interaction": metadata.get("player_interaction"),
        "learning_curve": metadata.get("learning_curve"),
        "language_dependence": metadata.get("language_dependence"),
        "suitable_for": _list(metadata.get("suitable_for")),
        "designer": _list(metadata.get("designer")),
        "publisher": _list(metadata.get("publisher")),
        "awards": _list(metadata.get("awards")),
        "ownership": metadata.get("ownership"),
        "bga_available": metadata.get("bga_available"),
        "locales": locales,
        "guide_url": f"https://kafka2306.github.io/boardgamelist/games/{slug}/",
        "provenance": {
            "source_markdown": path.as_posix(),
            "source_sha256": _sha256(raw),
            "metadata_kind": "repository-front-matter",
        },
        "quality_flags": quality_flags,
    }


def _facet(records: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for record in records:
        value = record.get(field)
        if isinstance(value, list):
            counts.update(str(item) for item in value if item not in (None, ""))
        elif value not in (None, ""):
            counts[str(value)] += 1
    return [{"value": key, "count": counts[key]} for key in sorted(counts)]


def build(games_dir: Path, output_dir: Path) -> dict[str, Any]:
    paths = sorted(path for path in games_dir.glob("*.md") if path.name != "index.md")
    records = [_record(path, games_dir) for path in paths]
    ids = [record["id"] for record in records]
    bgg_ids = [record["bgg"]["id"] for record in records if record["bgg"]["id"] is not None]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate canonical game id")
    if len(bgg_ids) != len(set(bgg_ids)):
        raise ValueError("duplicate BGG id across canonical games")

    catalog = {
        "schema": "https://kafka2306.github.io/boardgamelist/api/schema/game-catalog-v1",
        "version": 1,
        "count": len(records),
        "games": records,
    }
    facets = {
        "schema": "https://kafka2306.github.io/boardgamelist/api/schema/game-facets-v1",
        "version": 1,
        "game_count": len(records),
        "facets": {
            "tags": _facet(records, "tags"),
            "mechanics": _facet(records, "mechanics"),
            "themes": _facet(records, "themes"),
            "game_type": _facet(records, "game_type"),
            "player_interaction": _facet(records, "player_interaction"),
            "learning_curve": _facet(records, "learning_curve"),
            "language_dependence": _facet(records, "language_dependence"),
        },
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    catalog_bytes = (json.dumps(catalog, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    facets_bytes = (json.dumps(facets, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")

    csv_buffer = io.StringIO(newline="")
    fieldnames = [
        "id", "slug", "title", "japanese_title", "players_min", "players_max",
        "playtime_min", "playtime_max", "complexity", "bgg_id", "bgg_rating",
        "tags", "mechanics", "themes", "locales", "guide_url", "source_sha256",
    ]
    writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    for record in records:
        writer.writerow({
            "id": record["id"],
            "slug": record["slug"],
            "title": record["title"],
            "japanese_title": record["japanese_title"],
            "players_min": record["players"]["min"],
            "players_max": record["players"]["max"],
            "playtime_min": record["playtime_minutes"]["min"],
            "playtime_max": record["playtime_minutes"]["max"],
            "complexity": record["complexity"],
            "bgg_id": record["bgg"]["id"],
            "bgg_rating": record["bgg"]["rating"],
            "tags": "|".join(str(item) for item in record["tags"]),
            "mechanics": "|".join(str(item) for item in record["mechanics"]),
            "themes": "|".join(str(item) for item in record["themes"]),
            "locales": "|".join(record["locales"]),
            "guide_url": record["guide_url"],
            "source_sha256": record["provenance"]["source_sha256"],
        })
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    outputs = {
        "games.json": catalog_bytes,
        "games.csv": csv_bytes,
        "facets.json": facets_bytes,
    }
    for name, payload in outputs.items():
        (output_dir / name).write_bytes(payload)

    manifest = {
        "schema": "https://kafka2306.github.io/boardgamelist/api/schema/manifest-v1",
        "version": 1,
        "game_count": len(records),
        "source": {
            "path": games_dir.as_posix(),
            "canonical_policy": "top-level Markdown is one game; docs/games/ja is a locale view of the same entity",
            "external_metadata_note": "BGG ratings are carried from repository metadata; observation timestamps are unavailable and are flagged rather than guessed.",
        },
        "files": {
            name: {"bytes": len(payload), "sha256": _sha256(payload)}
            for name, payload in sorted(outputs.items())
        },
        "cache": {"max_age_seconds": 3600, "validation": "sha256"},
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    (output_dir / "manifest.json").write_bytes(manifest_bytes)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games-dir", default="docs/games")
    parser.add_argument("--output-dir", default="docs/api/v1")
    args = parser.parse_args()
    manifest = build(Path(args.games_dir), Path(args.output_dir))
    print(json.dumps({"game_count": manifest["game_count"], "files": manifest["files"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
