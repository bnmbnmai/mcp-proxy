#!/usr/bin/env bash
# Leftover USCG LNM districts for apollo collect (same mariners.js walker).
# Apply the door_argv / DIR exports from docs/APPLY-MARINERS-REMAINING-DISTRICTS.md
# onto the live ticks-collect.sh. Do not restart the worker from this VM.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
MCP="${MCP_PROXY_DIR:-$ROOT}"

export MARINERS_D1_DIR="${MARINERS_D1_DIR:-$MCP/data/mariners-d1}"
export MARINERS_D5_DIR="${MARINERS_D5_DIR:-$MCP/data/mariners-d5}"
export MARINERS_D9_DIR="${MARINERS_D9_DIR:-$MCP/data/mariners-d9}"
export MARINERS_D14_DIR="${MARINERS_D14_DIR:-$MCP/data/mariners-d14}"
export MARINERS_D17_DIR="${MARINERS_D17_DIR:-$MCP/data/mariners-d17}"

cd "$MCP"
for district in 1 5 9 14 17; do
  "$NODE_BIN" "$MCP/build/mariners.js" --district="$district"
done
