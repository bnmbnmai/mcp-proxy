#!/usr/bin/env python3
"""Decide grow / refresh / skip for one official ticks cache.

Thin first-slice caches (n < grow-until, default 24) grow in this collect pass.
Grown caches refresh when asOf is a year-2825 OCR typo or fetchedAt is older
than stale-hours (default 36). Otherwise skip. No secrets.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from typing import Any


DEFAULT_STALE_HOURS = 36
DEFAULT_GROW_UNTIL = 24


def cache_n(payload: dict[str, Any] | None) -> int:
    if not payload:
        return 0
    counts: list[int] = []
    for key in ("cardCount", "recordCount", "letterCount", "noticeCount", "tickCount"):
        value = payload.get(key)
        if isinstance(value, int) and value >= 0:
            counts.append(value)
    for key in ("cards", "letters", "alerts", "notices", "records", "ticks"):
        value = payload.get(key)
        if isinstance(value, list):
            counts.append(len(value))
    return max(counts) if counts else 0


def plan_action(
    payload: dict[str, Any] | None,
    stale_hours: int = DEFAULT_STALE_HOURS,
    grow_until: int = DEFAULT_GROW_UNTIL,
) -> tuple[str, int]:
    if payload is None:
        return "grow", 0
    n = cache_n(payload)
    as_of = str(payload.get("asOf") or "")
    fetched = str(payload.get("fetchedAt") or "")
    if as_of.startswith("2825"):
        return "refresh", n
    if n < grow_until:
        return "grow", n
    if not fetched:
        return "refresh", n
    try:
        ts = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
    except Exception:
        return "refresh", n
    age = datetime.now(timezone.utc) - ts.astimezone(timezone.utc)
    return ("refresh" if age > timedelta(hours=stale_hours) else "skip"), n


def load_snapshot(path: str) -> dict[str, Any] | None:
    try:
        data = json.load(open(path))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def main(argv: list[str] = sys.argv) -> int:
    if len(argv) < 2:
        print("usage: ticks-collect-plan.py SNAPSHOT.json [stale_hours] [grow_until]", file=sys.stderr)
        return 2
    path = argv[1]
    stale = int(argv[2]) if len(argv) > 2 else DEFAULT_STALE_HOURS
    grow_until = int(argv[3]) if len(argv) > 3 else DEFAULT_GROW_UNTIL
    action, n = plan_action(load_snapshot(path), stale, grow_until)
    print(f"{action} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
