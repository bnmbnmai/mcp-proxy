#!/usr/bin/env bash
# Daily apollo ticks collect (user cron, America/Boise).
# Hay/cattle first, then grow LIVE first-slice doors (cardCount=5) and refresh
# when official asOf moved or fetchedAt is older than 36h.
# First-pass products: /warning-letters and /form-483 grow past the old 5-card stub.
# Imagine-safe: skip 02:00-04:00 Boise and skip if Imagine/rmbg is active.
# flock so two collects cannot overlap. No secrets in this file or its log.
set -euo pipefail
export TZ="${TZ:-America/Boise}"

LOG="${TICKS_COLLECT_LOG:-$HOME/logs/ticks-collect.log}"
LOCK="${TICKS_COLLECT_LOCK:-$HOME/logs/ticks-collect.lock}"
MCP="${MCP_PROXY_DIR:-$HOME/projects/mcp-proxy}"
FARM="${FARM_PLAN_DIR:-$HOME/projects/farm-plan}"
STALE_HOURS="${TICKS_COLLECT_STALE_HOURS:-36}"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/v24.13.0/bin/node}"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node)"
fi

mkdir -p "$(dirname "$LOG")" "$(dirname "$LOCK")"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" | tee -a "$LOG"
}

# 02:00–03:59 America/Boise is reserved for Imagine.
hour="$(date +%H)"
if (( 10#$hour >= 2 && 10#$hour < 4 )); then
  log "skip Imagine window (02:00-04:00 America/Boise)"
  exit 0
fi

imagine_busy() {
  local hits
  hits="$(ps -eo args --no-headers 2>/dev/null | awk '
    BEGIN { IGNORECASE = 1 }
    /ticks-collect/ { next }
    /crontab/ { next }
    /(^|[[:space:]/])(imagine|rmbg|rembg)([._[:space:]-]|$)/ { print; next }
    /remove[[:space:]-]?bg/ { print }
  ')"
  [[ -n "${hits}" ]]
}

if imagine_busy; then
  log "skip Imagine/rmbg is active"
  exit 0
fi

exec 9>"$LOCK"
if ! flock -n 9; then
  log "skip flock: another collect holds $LOCK"
  exit 0
fi

# Snapshot dirs only. Do not source idaho-ticks-x402.env (settle key).
export TICKS_DIR="${TICKS_DIR:-$FARM/data/prices}"
export FARM_DATA_DIR="${FARM_DATA_DIR:-$FARM/data}"
export GMP_MD_DIR="${GMP_MD_DIR:-$MCP/data/gmp-md}"
export SWISSPAR_DIR="${SWISSPAR_DIR:-$MCP/data/swisspar}"
export PCAC_DIR="${PCAC_DIR:-$MCP/data/pcac}"
export FTC_WL_DIR="${FTC_WL_DIR:-$MCP/data/ftc-wl}"
export CFPB_ORDERS_DIR="${CFPB_ORDERS_DIR:-$MCP/data/cfpb-orders}"
export OCC_CD_DIR="${OCC_CD_DIR:-$MCP/data/occ-cd}"
export FDIC_ORDERS_DIR="${FDIC_ORDERS_DIR:-$MCP/data/fdic-orders}"
export FRB_ORDERS_DIR="${FRB_ORDERS_DIR:-$MCP/data/frb-orders}"
export NCUA_ORDERS_DIR="${NCUA_ORDERS_DIR:-$MCP/data/ncua-orders}"
export FINCEN_ORDERS_DIR="${FINCEN_ORDERS_DIR:-$MCP/data/fincen-orders}"
export FERC_ORDERS_DIR="${FERC_ORDERS_DIR:-$MCP/data/ferc-orders}"
export OFAC_ORDERS_DIR="${OFAC_ORDERS_DIR:-$MCP/data/ofac-orders}"
export BIS_ORDERS_DIR="${BIS_ORDERS_DIR:-$MCP/data/bis-orders}"
export CFTC_ORDERS_DIR="${CFTC_ORDERS_DIR:-$MCP/data/cftc-orders}"
export FIFRA_ORDERS_DIR="${FIFRA_ORDERS_DIR:-$MCP/data/fifra-orders}"
export DENOVO_ORDERS_DIR="${DENOVO_ORDERS_DIR:-$MCP/data/denovo-orders}"
export TTB_OIC_DIR="${TTB_OIC_DIR:-$MCP/data/ttb-oic}"
export AIR_LETTERS_DIR="${AIR_LETTERS_DIR:-$MCP/data/air-letters}"
export SUPERFUND_RODS_DIR="${SUPERFUND_RODS_DIR:-$MCP/data/superfund-rods}"
export ICO_MPN_DIR="${ICO_MPN_DIR:-$MCP/data/ico-mpn}"
export CMA_CA98_DIR="${CMA_CA98_DIR:-$MCP/data/cma-ca98}"
export FORM_483_DIR="${FORM_483_DIR:-$MCP/data/form-483}"
export GMP_DIR="${GMP_DIR:-$MCP/data/gmp}"
export AWA_DIR="${AWA_DIR:-$MCP/data/awa}"
export UNTITLED_LETTERS_DIR="${UNTITLED_LETTERS_DIR:-$MCP/data/untitled-letters}"
export WARNING_LETTERS_DIR="${WARNING_LETTERS_DIR:-$MCP/data/warning-letters}"

# Additional real bodies per first-slice grow. Cached cards do not consume LIMIT.
export ICO_MPN_LIMIT="${ICO_MPN_LIMIT:-8}"
export ICO_MPN_MAX_FETCH="${ICO_MPN_MAX_FETCH:-12}"
export CMA_CA98_LIMIT="${CMA_CA98_LIMIT:-8}"
export CMA_CA98_MAX_FETCH="${CMA_CA98_MAX_FETCH:-12}"
export SWISSPAR_LIMIT="${SWISSPAR_LIMIT:-8}"
export SWISSPAR_MAX_FETCH="${SWISSPAR_MAX_FETCH:-12}"
export OFAC_ORDERS_LIMIT="${OFAC_ORDERS_LIMIT:-8}"
export OFAC_ORDERS_MAX_FETCH="${OFAC_ORDERS_MAX_FETCH:-12}"
export BIS_ORDERS_LIMIT="${BIS_ORDERS_LIMIT:-8}"
export BIS_ORDERS_MAX_FETCH="${BIS_ORDERS_MAX_FETCH:-12}"
export CFTC_ORDERS_LIMIT="${CFTC_ORDERS_LIMIT:-8}"
export CFTC_ORDERS_MAX_FETCH="${CFTC_ORDERS_MAX_FETCH:-12}"
export GMP_MD_LIMIT="${GMP_MD_LIMIT:-8}"
export GMP_MD_MAX_FETCH="${GMP_MD_MAX_FETCH:-12}"
export AWA_LIMIT="${AWA_LIMIT:-8}"
export AWA_MAX_FETCH="${AWA_MAX_FETCH:-12}"
export PCAC_LIMIT="${PCAC_LIMIT:-8}"
export PCAC_MAX_FETCH="${PCAC_MAX_FETCH:-12}"
export FTC_WL_LIMIT="${FTC_WL_LIMIT:-8}"
export FTC_WL_MAX_FETCH="${FTC_WL_MAX_FETCH:-12}"
export CFPB_ORDERS_LIMIT="${CFPB_ORDERS_LIMIT:-8}"
export CFPB_ORDERS_MAX_FETCH="${CFPB_ORDERS_MAX_FETCH:-12}"
export OCC_CD_LIMIT="${OCC_CD_LIMIT:-8}"
export OCC_CD_MAX_FETCH="${OCC_CD_MAX_FETCH:-12}"
export FORM_483_LIMIT="${FORM_483_LIMIT:-25}"
export FORM_483_MAX_FETCH="${FORM_483_MAX_FETCH:-200}"
export WARNING_LETTERS_LIMIT="${WARNING_LETTERS_LIMIT:-50}"
export WARNING_LETTERS_MAX_FETCH="${WARNING_LETTERS_MAX_FETCH:-200}"

log "collect start"

if [[ "${SKIP_HAY:-}" != "1" ]]; then
  log "hay/cattle collect"
  /usr/bin/python3 "$FARM/scripts/collect-prices.py" >>"$LOG" 2>&1 || log "hay/cattle collect failed (exit $?)"
else
  log "skip hay (SKIP_HAY=1)"
fi

if imagine_busy; then
  log "stop after hay: Imagine/rmbg became active"
  exit 0
fi

# Priority first-slice SKUs, then other live 5-card doors.
# /ticks hay/cattle is above. First-pass products warning-letters + form-483 grow here.
DOORS=(
  warning-letters
  form-483
  cma-ca98
  ico-mpn
  swisspar
  ofac-orders
  bis-orders
  cftc-orders
  gmp-md
  awa
  pcac
  ftc-wl
  cfpb-orders
  occ-cd
  fifra-orders
  denovo-orders
  ttb-oic
  air-letters
  superfund-rods
  fdic-orders
  frb-orders
  ncua-orders
  fincen-orders
  ferc-orders
)

door_action() {
  local sku="$1"
  local snap="$MCP/data/$sku/snapshot.json"
  python3 - "$snap" "$STALE_HOURS" <<'PY'
import json, sys
from datetime import datetime, timezone, timedelta
path, stale_h = sys.argv[1], int(sys.argv[2])
try:
    d = json.load(open(path))
except Exception:
    print("grow")
    raise SystemExit(0)
n = len(d.get("cards") or d.get("letters") or d.get("alerts") or [])
as_of = str(d.get("asOf") or "")
fetched = str(d.get("fetchedAt") or "")
if as_of.startswith("2825"):
    print("refresh")
    raise SystemExit(0)
if n <= 5:
    print("grow")
    raise SystemExit(0)
if not fetched:
    print("refresh")
    raise SystemExit(0)
try:
    ts = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
except Exception:
    print("refresh")
    raise SystemExit(0)
age = datetime.now(timezone.utc) - ts.astimezone(timezone.utc)
print("refresh" if age > timedelta(hours=stale_h) else "skip")
PY
}

run_door() {
  local sku="$1"
  local js="$MCP/build/${sku}.js"
  if [[ ! -f "$js" ]]; then
    log "$sku missing $js"
    return 0
  fi
  local action
  action="$(door_action "$sku")"
  if [[ "$action" == "skip" ]]; then
    log "$sku skip (grown and fetchedAt within ${STALE_HOURS}h)"
    return 0
  fi
  if imagine_busy; then
    log "stop doors: Imagine/rmbg became active"
    return 1
  fi
  log "$sku $action"
  if ! "$NODE_BIN" "$js" >>"$LOG" 2>&1; then
    log "$sku collect failed"
  fi
  return 0
}

cd "$MCP"
for sku in "${DOORS[@]}"; do
  run_door "$sku" || break
done

log "collect done"
