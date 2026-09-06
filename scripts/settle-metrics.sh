#!/usr/bin/env bash
# Summarize the ticks shop settle JSONL by path. Internal / apollo only.
# Does not print payer addresses or tx hashes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f build/settle-log.js ]]; then
  npm run build
fi
exec node build/settle-log.js "$@"
