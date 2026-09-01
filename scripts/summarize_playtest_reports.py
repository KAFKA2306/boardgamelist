#!/usr/bin/env python3
"""複数の試遊レポートJSONを検証し、集計結果をJSONとMarkdownで出力する。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean
from typing import Any

RATING_FIELDS = ("ruleUnderstanding", "fun", "tempo", "replayIntent")


def _iso_ms(start: str | None, end: str | None) -> float | None:
    if not start or not end:
        return None
    from datetime import datetime
    try:
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"invalid ISO timestamp: {exc}") from exc
    delta = (end_dt - start_dt).total_seconds() / 60
    if delta < 0:
        raise ValueError("endedAt must not be earlier than gameStartedAt")
    return delta


def validate_report(report: Any, source: str) -> dict[str, Any]:
    if not isinstance(report, dict):
        raise ValueError(f"{source}: report must be a JSON object")
    for key in ("sessionId", "completed", "sessionStartedAt", "survey"):
        if key not in report:
            raise ValueError(f"{source}: missing required field {key}")
    if not isinstance(report["sessionId"], str) or not report["sessionId"].strip():
        raise ValueError(f"{source}: sessionId must be a non-empty string")
    if not isinstance(report["completed"], bool):
        raise ValueError(f"{source}: completed must be boolean")
    if not isinstance(report["survey"], dict):
        raise ValueError(f"{source}: survey must be an object")
    for field in RATING_FIELDS:
        value = report["survey"].get(field)
        if value is not None and (not isinstance(value, (int, float)) or isinstance(value, bool) or not 1 <= value <= 5):
            raise ValueError(f"{source}: survey.{field} must be null or within 1..5")
    _iso_ms(report.get("gameStartedAt"), report.get("endedAt"))
    return report


def load_reports(paths: list[Path]) -> list[dict[str, Any]]:
    reports: list[dict[str, Any]] = []
    session_ids: set[str] = set()
    for path in paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        candidates = payload if isinstance(payload, list) else [payload]
        for index, candidate in enumerate(candidates):
            report = validate_report(candidate, f"{path}:{index}")
            session_id = report["sessionId"]
            if session_id in session_ids:
                raise ValueError(f"duplicate sessionId: {session_id}")
            session_ids.add(session_id)
            reports.append(report)
    if not reports:
        raise ValueError("no playtest reports found")
    return reports


def aggregate(reports: list[dict[str, Any]]) -> dict[str, Any]:
    completed = [report for report in reports if report["completed"]]
    durations = [
        duration
        for report in completed
        if (duration := _iso_ms(report.get("gameStartedAt"), report.get("endedAt"))) is not None
    ]
    survey_submitted = [report for report in reports if report["survey"].get("submittedAt")]
    ratings: dict[str, dict[str, Any]] = {}
    for field in RATING_FIELDS:
        values = [report["survey"].get(field) for report in reports if report["survey"].get(field) is not None]
        ratings[field] = {
            "responses": len(values),
            "average": round(mean(values), 2) if values else None,
        }
    comments = [
        report["survey"].get("comment", "").strip()
        for report in reports
        if isinstance(report["survey"].get("comment"), str) and report["survey"].get("comment", "").strip()
    ]
    return {
        "schema_version": 1,
        "sessions": len(reports),
        "completed": len(completed),
        "completion_rate": round(len(completed) / len(reports), 4),
        "survey_submitted": len(survey_submitted),
        "survey_response_rate": round(len(survey_submitted) / len(reports), 4),
        "completed_duration_minutes": {
            "observations": len(durations),
            "average": round(mean(durations), 2) if durations else None,
        },
        "ratings": ratings,
        "comments": comments,
        "session_ids": [report["sessionId"] for report in reports],
    }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# 試遊分析レポート",
        "",
        f"- セッション数: {summary['sessions']}",
        f"- 完走数: {summary['completed']}",
        f"- 完走率: {summary['completion_rate']:.1%}",
        f"- アンケート回答数: {summary['survey_submitted']}",
        f"- アンケート回答率: {summary['survey_response_rate']:.1%}",
    ]
    duration = summary["completed_duration_minutes"]
    if duration["average"] is not None:
        lines.append(f"- 完走セッション平均時間: {duration['average']:.1f}分（{duration['observations']}件）")
    lines.extend(["", "## 5段階評価", "", "| 指標 | 回答数 | 平均 |", "| --- | ---: | ---: |"])
    labels = {
        "ruleUnderstanding": "ルール理解度",
        "fun": "面白さ",
        "tempo": "テンポ",
        "replayIntent": "再プレイ意向",
    }
    for field in RATING_FIELDS:
        item = summary["ratings"][field]
        average = "UNVERIFIED" if item["average"] is None else f"{item['average']:.2f}"
        lines.append(f"| {labels[field]} | {item['responses']} | {average} |")
    lines.extend(["", "## 自由記述", ""])
    if summary["comments"]:
        lines.extend(f"- {comment}" for comment in summary["comments"])
    else:
        lines.append("- UNVERIFIED: 自由記述の回答はありません。")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reports", nargs="+", type=Path)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--markdown-output", type=Path)
    args = parser.parse_args()

    summary = aggregate(load_reports(args.reports))
    json_text = json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    markdown_text = render_markdown(summary)
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json_text, encoding="utf-8")
    else:
        print(json_text, end="")
    if args.markdown_output:
        args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
        args.markdown_output.write_text(markdown_text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
