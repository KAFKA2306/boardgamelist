#!/usr/bin/env python3
"""Audit board-game Markdown front matter without third-party dependencies."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

PLAYER_RE = re.compile(r"^\s*(\d+)(?:\s*(?:-|–|〜|~)\s*(\d+))?\s*$")
TIME_RE = re.compile(r"^\s*(\d+)\s*(?:-|–|〜|~)?\s*(\d+)?\s*(?:min|mins|minutes|分)?\s*$", re.I)


@dataclass(frozen=True)
class Issue:
    severity: str
    code: str
    path: str
    message: str


def _scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    lower = value.lower()
    if lower in {"true", "false"}:
        return lower == "true"
    if lower in {"null", "none", "~"}:
        return None
    if value.startswith("[") and value.endswith("]"):
        body = value[1:-1].strip()
        return [] if not body else [_scalar(part) for part in body.split(",")]
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value


def parse_front_matter(text: str) -> dict[str, Any] | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    data: dict[str, Any] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return data
        if not line or line[0].isspace() or line.lstrip().startswith("#"):
            continue
        key, separator, raw = line.partition(":")
        if separator:
            data[key.strip()] = _scalar(raw)
    raise ValueError("front matter is not terminated by '---'")


def _positive_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def _locale(path: Path) -> str:
    return "ja" if "ja" in path.parts else "en"


def _entity_path(path: Path) -> str:
    parts = list(path.parts)
    if "ja" in parts:
        parts.remove("ja")
    return "/".join(parts)


def validate(path: Path, metadata: dict[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    rel = path.as_posix()
    title = metadata.get("title")
    if not isinstance(title, str) or not title.strip():
        issues.append(Issue("error", "missing-title", rel, "title must be a non-empty string"))

    if "bgg_id" in metadata and (not isinstance(metadata["bgg_id"], int) or isinstance(metadata["bgg_id"], bool) or metadata["bgg_id"] <= 0):
        issues.append(Issue("error", "invalid-bgg-id", rel, "bgg_id must be a positive integer"))
    if "bgg_rating" in metadata and (not _positive_number(metadata["bgg_rating"]) or float(metadata["bgg_rating"]) > 10):
        issues.append(Issue("error", "invalid-bgg-rating", rel, "bgg_rating must be within (0, 10]"))
    if "complexity" in metadata and (not _positive_number(metadata["complexity"]) or float(metadata["complexity"]) > 5):
        issues.append(Issue("error", "invalid-complexity", rel, "complexity must be within (0, 5]"))

    players = metadata.get("players")
    if players is not None:
        match = PLAYER_RE.fullmatch(str(players))
        if not match:
            issues.append(Issue("error", "invalid-players", rel, "players must be a positive integer or ordered range such as '2-4'"))
        else:
            low = int(match.group(1))
            high = int(match.group(2) or match.group(1))
            if low < 1 or low > high:
                issues.append(Issue("error", "invalid-players", rel, "players must be a positive integer or ordered range such as '2-4'"))

    playtime = metadata.get("playtime")
    if playtime is not None:
        match = TIME_RE.fullmatch(str(playtime))
        if not match:
            issues.append(Issue("error", "invalid-playtime", rel, "playtime must be minutes or a minute range"))

    for recommended in ("bgg_id", "players", "playtime"):
        if recommended not in metadata:
            issues.append(Issue("warning", f"missing-{recommended.replace('_', '-')}", rel, f"{recommended} is recommended for searchable metadata"))
    return issues


def audit(paths: Iterable[Path]) -> dict[str, Any]:
    issues: list[Issue] = []
    records: list[dict[str, Any]] = []
    ids: dict[int, list[dict[str, str]]] = {}
    scanned = 0

    for path in sorted(paths, key=lambda item: item.as_posix()):
        if path.name == "index.md":
            continue
        scanned += 1
        text = path.read_text(encoding="utf-8")
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        try:
            metadata = parse_front_matter(text)
        except ValueError as exc:
            issues.append(Issue("error", "malformed-front-matter", path.as_posix(), str(exc)))
            continue
        if metadata is None:
            issues.append(Issue("warning", "missing-front-matter", path.as_posix(), "document has no YAML front matter"))
            continue
        issues.extend(validate(path, metadata))
        bgg_id = metadata.get("bgg_id")
        if isinstance(bgg_id, int) and not isinstance(bgg_id, bool):
            ids.setdefault(bgg_id, []).append({"path": path.as_posix(), "entity_path": _entity_path(path)})
        records.append({
            "path": path.as_posix(),
            "entity_path": _entity_path(path),
            "locale": _locale(path),
            "sha256": digest,
            "title": metadata.get("title"),
            "bgg_id": bgg_id,
            "players": metadata.get("players"),
            "playtime": metadata.get("playtime"),
        })

    for bgg_id, entries in sorted(ids.items()):
        entity_paths = {entry["entity_path"] for entry in entries}
        if len(entity_paths) > 1:
            joined = ", ".join(entry["path"] for entry in entries)
            for entry in entries:
                issues.append(Issue("error", "duplicate-bgg-id", entry["path"], f"bgg_id {bgg_id} is shared by distinct games: {joined}"))

    serialized = sorted((asdict(issue) for issue in issues), key=lambda item: (item["severity"], item["code"], item["path"]))
    return {
        "schema_version": 2,
        "summary": {
            "files_scanned": scanned,
            "records_indexed": len(records),
            "canonical_games": len({_entity_path(Path(record["path"])) for record in records}),
            "errors": sum(issue["severity"] == "error" for issue in serialized),
            "warnings": sum(issue["severity"] == "warning" for issue in serialized),
        },
        "records": records,
        "issues": serialized,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["docs/games"], help="Markdown files or directories")
    parser.add_argument("--report", default="build/game-metadata-audit.json", help="JSON audit report path")
    parser.add_argument("--fail-on-warnings", action="store_true")
    args = parser.parse_args()

    markdown: list[Path] = []
    for raw in args.paths:
        path = Path(raw)
        markdown.extend(path.rglob("*.md") if path.is_dir() else [path])
    report = audit(markdown)
    destination = Path(args.report)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = report["summary"]
    print(json.dumps(summary, ensure_ascii=False))
    for issue in report["issues"]:
        print(f"{issue['severity'].upper()}: {issue['path']}: {issue['code']}: {issue['message']}")
    if summary["errors"] or (args.fail_on_warnings and summary["warnings"]):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
