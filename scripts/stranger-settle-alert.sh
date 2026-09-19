#!/usr/bin/env bash
# Scan the existing settle journal for a NEW stranger. One-line Chief ping.
# Does not invent settles. Does not print payer addresses.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f build/stranger-settle-alert.js ]]; then
  npm run build
fi
exec node build/stranger-settle-alert.js "$@"
