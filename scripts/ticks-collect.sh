#!/usr/bin/env bash
# Daily apollo ticks collect (user cron, America/Boise).
# Hay/cattle FIRST every morning, then deepen LIVE official first-slice caches
# past cardCount=5 toward ~20–24 using official walkers. Skip fresh fat doors
# (n >= 20 and fetchedAt within 36h). Refresh when official asOf moved
# (year-2825) or fetchedAt > 36h. One pass. No second cron.
# Imagine-safe: skip 02:00-04:00 Boise and skip if Imagine/rmbg is active.
# flock so two collects cannot overlap. No secrets in this file or its log.
# No new SKUs. Code path only — CoS applies on apollo after Imagine.
set -euo pipefail
export TZ="${TZ:-America/Boise}"

LOG="${TICKS_COLLECT_LOG:-$HOME/logs/ticks-collect.log}"
LOCK="${TICKS_COLLECT_LOCK:-$HOME/logs/ticks-collect.lock}"
MCP="${MCP_PROXY_DIR:-$HOME/projects/mcp-proxy}"
FARM="${FARM_PLAN_DIR:-$HOME/projects/farm-plan}"
STALE_HOURS="${TICKS_COLLECT_STALE_HOURS:-36}"
# Grow while cache n is below this. Cached ids do not consume LIMIT.
GROW_UNTIL="${TICKS_COLLECT_GROW_UNTIL:-20}"
GROW_LIMIT="${TICKS_COLLECT_GROW_LIMIT:-24}"
GROW_FETCH="${TICKS_COLLECT_GROW_FETCH:-36}"
PLAN="${TICKS_COLLECT_PLAN:-$MCP/scripts/ticks-collect-plan.py}"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/v24.13.0/bin/node}"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node)"
fi
DRY_RUN="${TICKS_COLLECT_DRY_RUN:-}"

mkdir -p "$(dirname "$LOG")" "$(dirname "$LOCK")"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" | tee -a "$LOG"
}

# 02:00–03:59 America/Boise is reserved for Imagine.
hour="$(date +%H)"
if [[ "${TICKS_COLLECT_SKIP_IMAGINE:-}" != "1" && "${DRY_RUN}" != "1" ]]; then
  if (( 10#$hour >= 2 && 10#$hour < 4 )); then
    log "skip Imagine window (02:00-04:00 America/Boise)"
    exit 0
  fi
fi

imagine_busy() {
  [[ "${TICKS_COLLECT_SKIP_IMAGINE:-}" == "1" || "${DRY_RUN}" == "1" ]] && return 1
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

if [[ "${DRY_RUN}" != "1" ]]; then
  exec 9>"$LOCK"
  if ! flock -n 9; then
    log "skip flock: another collect holds $LOCK"
    exit 0
  fi
fi

# Snapshot dirs only. Do not source idaho-ticks-x402.env (settle key).
export TICKS_DIR="${TICKS_DIR:-$FARM/data/prices}"
export FARM_DATA_DIR="${FARM_DATA_DIR:-$FARM/data}"
export IMPORT_ALERTS_DIR="${IMPORT_ALERTS_DIR:-$MCP/data/import-alerts}"
export MARINERS_DIR="${MARINERS_DIR:-$MCP/data/mariners}"
export MARINERS_D11_DIR="${MARINERS_D11_DIR:-$MCP/data/mariners-d11}"
export MARINERS_D7_DIR="${MARINERS_D7_DIR:-$MCP/data/mariners-d7}"
export MARINERS_D8_DIR="${MARINERS_D8_DIR:-$MCP/data/mariners-d8}"
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

# Additional real bodies per grow. Cached cards do not consume LIMIT.
# First-slice official doors default to dozens, not 5.
set_grow() {
  local prefix="$1"
  local limit_var="${prefix}_LIMIT"
  local fetch_var="${prefix}_MAX_FETCH"
  printf -v "${limit_var}" '%s' "${!limit_var:-$GROW_LIMIT}"
  printf -v "${fetch_var}" '%s' "${!fetch_var:-$GROW_FETCH}"
  export "${limit_var}" "${fetch_var}"
}

for prefix in \
  ICO_MPN CMA_CA98 SWISSPAR OFAC_ORDERS BIS_ORDERS CFTC_ORDERS GMP_MD AWA \
  PCAC FTC_WL CFPB_ORDERS OCC_CD FIFRA_ORDERS DENOVO_ORDERS TTB_OIC \
  AIR_LETTERS SUPERFUND_RODS FDIC_ORDERS FRB_ORDERS NCUA_ORDERS \
  FINCEN_ORDERS FERC_ORDERS
do
  set_grow "$prefix"
done

export FORM_483_LIMIT="${FORM_483_LIMIT:-25}"
export FORM_483_MAX_FETCH="${FORM_483_MAX_FETCH:-200}"
export WARNING_LETTERS_LIMIT="${WARNING_LETTERS_LIMIT:-50}"
export WARNING_LETTERS_MAX_FETCH="${WARNING_LETTERS_MAX_FETCH:-200}"
export UNTITLED_LETTERS_LIMIT="${UNTITLED_LETTERS_LIMIT:-30}"
export UNTITLED_LETTERS_MAX_FETCH="${UNTITLED_LETTERS_MAX_FETCH:-40}"
export GMP_LIMIT="${GMP_LIMIT:-50}"
export GMP_MAX_FETCH="${GMP_MAX_FETCH:-400}"

log "collect start growUntil=${GROW_UNTIL} limit=${GROW_LIMIT} dryRun=${DRY_RUN:-0}"

ticks_snapshot() {
  local p
  for p in \
    "${TICKS_DIR}/snapshot.json" \
    "${TICKS_DIR}/manifest.json" \
    "${MCP}/data/ticks-ams/snapshot.json" \
    "${MCP}/data/ticks-ams/manifest.json"
  do
    if [[ -f "$p" ]]; then
      printf '%s\n' "$p"
      return 0
    fi
  done
  printf '%s\n' "${TICKS_DIR}/snapshot.json"
}

plan_fields() {
  local snap="$1"
  local out
  out="$(python3 "$PLAN" "$snap" "$STALE_HOURS" "$GROW_UNTIL")"
  _action="${out%% *}"
  local rest="${out#* }"
  _n="${rest%% *}"
  _reason="${rest#* }"
  _reason="${_reason%% *}"
}

# Always consider /ticks first. Skip a full AMS recrawl when tickCount is
# healthy and fetchedAt is fresher than 36h so the live hay cache is not wiped.
_ticks_snap="$(ticks_snapshot)"
plan_fields "$_ticks_snap"
_ticks_before="${_n}"
_ticks_action="${_action}"
_ticks_reason="${_reason}"
if [[ "${_ticks_action}" == "skip" || "${SKIP_HAY:-}" == "1" || "${DRY_RUN}" == "1" ]]; then
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "dry-run plan nationwide AMS hay/cattle/grain (same /ticks door)"
  elif [[ "${SKIP_HAY:-}" == "1" ]]; then
    log "skip hay (SKIP_HAY=1)"
  fi
  log "/ticks, ${_ticks_before}, ${_ticks_before}, ${_ticks_reason}"
else
  log "hay/cattle collect"
  /usr/bin/python3 "$FARM/scripts/collect-prices.py" >>"$LOG" 2>&1 || log "hay/cattle collect failed (exit $?)"
  log "nationwide AMS hay/cattle/grain collect"
  if [[ -f "$MCP/build/ticks-ams.js" ]]; then
    "$NODE_BIN" "$MCP/build/ticks-ams.js" >>"$LOG" 2>&1 || log "nationwide AMS collect failed (exit $?)"
  else
    log "nationwide AMS collect skipped (missing $MCP/build/ticks-ams.js)"
  fi
  plan_fields "$(ticks_snapshot)"
  log "/ticks, ${_ticks_before}, ${_n}, $([[ "${_ticks_action}" == "grow" ]] && echo grew || echo refreshed)"
fi

if imagine_busy; then
  log "stop after hay: Imagine/rmbg became active"
  exit 0
fi

# Every listed official door except /ticks (hay/cattle above). No new SKUs.
DOORS=(
  warning-letters
  form-483
  untitled-letters
  gmp
  gmp-md
  import-alerts
  mariners
  mariners-d11
  mariners-d7
  mariners-d8
  cma-ca98
  ico-mpn
  swisspar
  ofac-orders
  bis-orders
  cftc-orders
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

door_snap() {
  local sku="$1"
  printf '%s\n' "$MCP/data/$sku/snapshot.json"
}

door_argv() {
  local sku="$1"
  case "$sku" in
    mariners-d11) printf '%s\n' --district=11 ;;
    mariners-d7) printf '%s\n' --district=7 ;;
    mariners-d8) printf '%s\n' --district=8 ;;
  esac
}

door_js() {
  local sku="$1"
  case "$sku" in
    mariners-d11|mariners-d7|mariners-d8) printf '%s\n' "$MCP/build/mariners.js" ;;
    *) printf '%s\n' "$MCP/build/${sku}.js" ;;
  esac
}

run_door() {
  local sku="$1"
  local js snap
  js="$(door_js "$sku")"
  snap="$(door_snap "$sku")"
  if [[ ! -f "$js" && "${DRY_RUN}" != "1" ]]; then
    log "$sku missing $js"
    return 0
  fi
  plan_fields "$snap"
  local before="${_n}"
  local action="${_action}"
  local reason="${_reason}"
  if [[ "$action" == "skip" ]]; then
    log "/${sku}, ${before}, ${before}, ${reason}"
    return 0
  fi
  if imagine_busy; then
    log "stop doors: Imagine/rmbg became active"
    return 1
  fi
  log "$sku $action n=${before} growUntil=${GROW_UNTIL} limit=${GROW_LIMIT}"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "/${sku}, ${before}, ${before}, ${reason}"
    return 0
  fi
  local extra
  extra="$(door_argv "$sku")"
  if ! "$NODE_BIN" "$js" ${extra:+$extra} >>"$LOG" 2>&1; then
    log "$sku collect failed"
  fi
  plan_fields "$snap"
  local after="${_n}"
  local done="$reason"
  if [[ "$action" == "grow" && "$after" -le 5 ]]; then
    done="teaser-blocked"
  elif [[ "$action" == "grow" ]]; then
    done="grew"
  elif [[ "$action" == "refresh" ]]; then
    done="refreshed"
  fi
  log "/${sku}, ${before}, ${after}, ${done}"
  return 0
}

cd "$MCP"
for sku in "${DOORS[@]}"; do
  run_door "$sku" || break
done

log "collect done"
