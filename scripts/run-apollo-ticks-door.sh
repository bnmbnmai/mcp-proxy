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
echo "unpaid /ticks ($0.02): curl -i http://<lan-ip>:$PORT/ticks"
echo "unpaid /import-alerts ($0.05): curl -i http://<lan-ip>:$PORT/import-alerts"
echo "unpaid /mariners ($0.05): curl -i http://<lan-ip>:$PORT/mariners"
echo "unpaid /warning-letters ($0.05): curl -i http://<lan-ip>:$PORT/warning-letters"
echo "free manifest: curl -s http://<lan-ip>:$PORT/import-alerts/manifest.json"
echo "free mariners: curl -s http://<lan-ip>:$PORT/mariners/manifest.json"
echo "free warning-letters: curl -s http://<lan-ip>:$PORT/warning-letters/manifest.json"
echo "paid smoke: X402_SKIP_SETTLE=1 … then curl -s http://<lan-ip>:$PORT/ticks -H 'X-PAYMENT: test'"
exec node build/ticks-door.js
