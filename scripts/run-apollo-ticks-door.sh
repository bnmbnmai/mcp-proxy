#!/usr/bin/env bash
# Run the thin Idaho ticks x402 door on apollo / the media box (LAN bind).
# Public go-live is later. Does not list on x402scan / Bazaar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export TICKS_DIR="${TICKS_DIR:-$HOME/projects/farm-plan/data/prices}"
export BIND_HOST="${BIND_HOST:-0.0.0.0}"
export PORT="${PORT:-4020}"

cd "$ROOT"
if [[ ! -f build/ticks-door.js ]]; then
  npm run build
fi

echo "TICKS_DIR=$TICKS_DIR"
echo "BIND_HOST=$BIND_HOST PORT=$PORT"
echo "unpaid: curl -i http://<lan-ip>:$PORT/ticks"
echo "paid smoke: X402_SKIP_SETTLE=1 … then curl -s http://<lan-ip>:$PORT/ticks -H 'X-PAYMENT: test'"
exec node build/ticks-door.js
