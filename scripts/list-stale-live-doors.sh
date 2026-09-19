#!/usr/bin/env bash
# Draft-only list of empty/stale LIVE doors. No outbound sends.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f build/live-door-loop-closer.js ]]; then
  npm run build
fi
exec node build/live-door-loop-closer.js --draft-only "$@"
