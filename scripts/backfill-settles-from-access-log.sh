#!/usr/bin/env bash
# BEST-EFFORT one-shot from the existing request tape (preferred) or a Caddy
# JSON log that includes X-PAYMENT. Apollo ticks Caddy has no access file.
# Only paid-door 200 + paymentHeader:true. Cannot recover tx hash.
# Usage: ./scripts/backfill-settles-from-access-log.sh data/shop-request-log.jsonl
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ $# -lt 1 ]]; then
  echo "best-effort backfill: pass access-log or shop-request-log.jsonl paths" >&2
  echo "usage: $0 /var/log/caddy/access.log [data/shop-request-log.jsonl]" >&2
  exit 2
fi
if [[ ! -f build/settle-log.js ]]; then
  npm run build
fi
exec node build/settle-log.js --backfill "$@"
