#!/usr/bin/env python3
"""Decide grow / refresh / skip for one official ticks cache.

Thin first-slice caches (n < grow-until, default 20) grow in this collect pass
using the official walker. Grown / fat caches skip when official asOf is a real
date and fetchedAt is fresher than stale-hours (default 36). Refresh when asOf
is a year-2825 OCR typo or fetchedAt is missing / older than 36h.

Skip reasons: fresh (n >= 20, fetchedAt < 36h) or fat (same, n >= 200).
Grow/refresh reasons: thin | asof | stale. No secrets.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DEFAULT_STALE_HOURS = 36
DEFAULT_GROW_UNTIL = 20
FAT_N = 200


def cache_n(payload: dict[str, Any] | None) -> int:
    if not payload:
        return 0
    counts: list[int] = []
    for key in ("cardCount", "recordCount", "letterCount", "noticeCount", "tickCount"):
        value = payload.get(key)
        if isinstance(value, int) and value >= 0:
            counts.append(value)
    for key in ("cards", "letters", "alerts", "notices", "records", "ticks", "rows"):
        value = payload.get(key)
        if isinstance(value, list):
            counts.append(len(value))
    return max(counts) if counts else 0


def plan_action(
    payload: dict[str, Any] | None,
    stale_hours: int = DEFAULT_STALE_HOURS,
    grow_until: int = DEFAULT_GROW_UNTIL,
) -> tuple[str, int, str]:
    if payload is None:
        return "grow", 0, "thin"
    n = cache_n(payload)
    as_of = str(payload.get("asOf") or "")
    fetched = str(payload.get("fetchedAt") or "")
    if as_of.startswith("2825"):
        return "refresh", n, "asof"
    if n < grow_until:
        return "grow", n, "thin"
    if not fetched:
        return "refresh", n, "stale"
    try:
        ts = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
    except Exception:
        return "refresh", n, "stale"
    age = datetime.now(timezone.utc) - ts.astimezone(timezone.utc)
    if age > timedelta(hours=stale_hours):
        return "refresh", n, "stale"
    return "skip", n, ("fat" if n >= FAT_N else "fresh")


def load_snapshot(path: str) -> dict[str, Any] | None:
    try:
        data = json.load(open(path))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _row_id(row: Any, key: str, index: int) -> str:
    if isinstance(row, dict):
        rid = row.get("id") or row.get("series") or row.get("sourceUrl")
        if rid:
            return str(rid)
    return f"{key}:{index}"


def merge_hay_payload(paths: list[str]) -> dict[str, Any] | None:
    """Merge Idaho board.json + nationwide AMS snapshot the same way /ticks does."""
    ids: set[str] = set()
    fetched = ""
    as_of = ""
    fallback_n = 0
    found = False
    for path in paths:
        if not path or not Path(path).is_file():
            continue
        data = load_snapshot(path)
        if not data:
            continue
        found = True
        fetched_c = str(data.get("fetchedAt") or "")
        if fetched_c and (not fetched or fetched_c > fetched):
            fetched = fetched_c
        as_c = str(data.get("asOf") or "")
        if as_c and as_c != "None" and (not as_of or as_c > as_of):
            as_of = as_c
        fallback_n = max(fallback_n, cache_n(data))
        for key in ("rows", "ticks"):
            value = data.get(key)
            if not isinstance(value, list):
                continue
            for i, row in enumerate(value):
                ids.add(_row_id(row, key, i))
    if not found:
        return None
    return {
        "tickCount": len(ids) or fallback_n,
        "fetchedAt": fetched or None,
        "asOf": as_of or None,
    }


def write_hay_plan(out_path: str, paths: list[str]) -> int:
    payload = merge_hay_payload(paths)
    if payload is None:
        return 2
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(payload, indent=2) + "\n")
    return 0


def main(argv: list[str] = sys.argv) -> int:
    if len(argv) >= 3 and argv[1] == "--write-hay":
        if len(argv) < 4:
            print("usage: ticks-collect-plan.py --write-hay OUT.json SNAP [SNAP...]", file=sys.stderr)
            return 2
        return write_hay_plan(argv[2], argv[3:])
    if len(argv) < 2:
        print("usage: ticks-collect-plan.py SNAPSHOT.json [stale_hours] [grow_until]", file=sys.stderr)
        return 2
    path = argv[1]
    stale = int(argv[2]) if len(argv) > 2 else DEFAULT_STALE_HOURS
    grow_until = int(argv[3]) if len(argv) > 3 else DEFAULT_GROW_UNTIL
    action, n, reason = plan_action(load_snapshot(path), stale, grow_until)
    print(f"{action} {n} {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
