#!/usr/bin/env bash
# BEST-EFFORT one-shot: paid HTTP 200s by path from Caddy / combined access
# logs or shop-request-log.jsonl. Cannot recover payer or tx hash.
# Usage: ./scripts/backfill-settles-from-access-log.sh FILE [FILE...]
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
