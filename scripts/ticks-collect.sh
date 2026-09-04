#!/usr/bin/env bash
# Daily apollo ticks collect (user cron, America/Boise).
# Hay/cattle FIRST, then every official paid door from live well-known
# (or PUBLIC_BAZAAR_SKUS that well-known is generated from). Do not freeze
# a 33/36/40/44 list. Two passes: 7:45am and 7:45pm America/Boise. Delta only:
# CHECK every door including fat and source-capped; skip only the recrawl
# when official asOf is unchanged. Refresh when asOf moved (year-2825) or
# fetchedAt > 36h.
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN="${TICKS_COLLECT_PLAN:-$SCRIPT_DIR/ticks-collect-plan.py}"
WELL_KNOWN_URL="${TICKS_COLLECT_WELL_KNOWN_URL:-http://127.0.0.1:4020/.well-known/x402}"
WELL_KNOWN_FILE="${TICKS_COLLECT_WELL_KNOWN_FILE:-}"
DOOR_SRC="${TICKS_COLLECT_DOOR_SRC:-$SCRIPT_DIR/../src/ticks-door.ts}"
# 1 = run the official walker on every door (delta inside the collector).
# Skip recrawl only when the walker sees unchanged asOf. Dry-run still plans.
CHECK_ALL="${TICKS_COLLECT_CHECK_ALL:-1}"
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
export TICKS_AMS_DIR="${TICKS_AMS_DIR:-$MCP/data/ticks-ams}"
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
export EMA_REFERRALS_DIR="${EMA_REFERRALS_DIR:-$MCP/data/ema-referrals}"
export CDER_REVIEWS_DIR="${CDER_REVIEWS_DIR:-$MCP/data/cder-reviews}"
export NPDES_PERMITS_DIR="${NPDES_PERMITS_DIR:-$MCP/data/npdes-permits}"
export OFSTED_INSPECTIONS_DIR="${OFSTED_INSPECTIONS_DIR:-$MCP/data/ofsted-inspections}"
export OFWAT_ENFORCEMENT_DIR="${OFWAT_ENFORCEMENT_DIR:-$MCP/data/ofwat-enforcement}"
export OFGEM_ENFORCEMENT_DIR="${OFGEM_ENFORCEMENT_DIR:-$MCP/data/ofgem-enforcement}"
export GAIN_DIR="${GAIN_DIR:-$MCP/data/gain}"
export ORR_ENFORCEMENT_DIR="${ORR_ENFORCEMENT_DIR:-$MCP/data/orr-enforcement}"
export PHMSA_ORDERS_DIR="${PHMSA_ORDERS_DIR:-$MCP/data/phmsa-orders}"
export AAIB_REPORTS_DIR="${AAIB_REPORTS_DIR:-$MCP/data/aaib-reports}"
export CSB_REPORTS_DIR="${CSB_REPORTS_DIR:-$MCP/data/csb-reports}"
export HHS_OIG_REPORTS_DIR="${HHS_OIG_REPORTS_DIR:-$MCP/data/hhs-oig-reports}"
export FSIS_HUMANE_DIR="${FSIS_HUMANE_DIR:-$MCP/data/fsis-humane}"
export EPA_CAFO_DIR="${EPA_CAFO_DIR:-$MCP/data/epa-cafo}"
export FORM_483_DIR="${FORM_483_DIR:-$MCP/data/form-483}"
export GMP_DIR="${GMP_DIR:-$MCP/data/gmp}"
export AWA_DIR="${AWA_DIR:-$MCP/data/awa}"
export UNTITLED_LETTERS_DIR="${UNTITLED_LETTERS_DIR:-$MCP/data/untitled-letters}"
export WARNING_LETTERS_DIR="${WARNING_LETTERS_DIR:-$MCP/data/warning-letters}"

# Additional real bodies per grow. Cached ids do not consume LIMIT.
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
  ICO_MPN CMA_CA98 EMA_REFERRALS SWISSPAR OFAC_ORDERS BIS_ORDERS CFTC_ORDERS GMP_MD AWA \
  PCAC FTC_WL CFPB_ORDERS OCC_CD FIFRA_ORDERS DENOVO_ORDERS TTB_OIC \
  AIR_LETTERS SUPERFUND_RODS FDIC_ORDERS FRB_ORDERS NCUA_ORDERS \
  FINCEN_ORDERS FERC_ORDERS CDER_REVIEWS NPDES_PERMITS OFSTED_INSPECTIONS \
  OFWAT_ENFORCEMENT OFGEM_ENFORCEMENT GAIN ORR_ENFORCEMENT PHMSA_ORDERS \
  AAIB_REPORTS CSB_REPORTS HHS_OIG_REPORTS FSIS_HUMANE EPA_CAFO
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
    "${TICKS_DIR}/manifest.json"
  do
    if [[ -f "$p" ]]; then
      printf '%s\n' "$p"
      return 0
    fi
  done
  local hay_plan="${TICKS_COLLECT_HAY_PLAN:-$HOME/logs/ticks-hay-plan.json}"
  mkdir -p "$(dirname "$hay_plan")"
  # Prefer the live /ticks manifest (611 + AMS fetchedAt) so skip-fresh does
  # not recrawl a healthy hay cache from the AMS-only 483-row snapshot.
  if [[ "${TICKS_COLLECT_SKIP_LIVE_HAY:-}" != "1" ]]; then
    local tmp="${hay_plan}.tmp"
    if command -v curl >/dev/null 2>&1 && \
       curl -sf --max-time 2 -H 'User-Agent: ticks-collect' \
         "${TICKS_COLLECT_HAY_MANIFEST_URL:-http://127.0.0.1:4020/manifest.json}" \
         -o "$tmp" 2>/dev/null; then
      if python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert isinstance(d.get('tickCount'), int) and d['tickCount']>0" "$tmp"; then
        mv "$tmp" "$hay_plan"
        printf '%s\n' "$hay_plan"
        return 0
      fi
    fi
    rm -f "$tmp"
  fi
  if python3 "$PLAN" --write-hay "$hay_plan" \
      "${TICKS_DIR}/board.json" \
      "${TICKS_AMS_DIR}/snapshot.json" \
      "${TICKS_AMS_DIR}/manifest.json" \
      "${MCP}/data/ticks-ams/snapshot.json"; then
    printf '%s\n' "$hay_plan"
    return 0
  fi
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
if [[ "${SKIP_HAY:-}" == "1" ]]; then
  log "skip hay (SKIP_HAY=1)"
  log "/ticks, ${_ticks_before}, ${_ticks_before}, ${_ticks_reason}"
elif [[ "${DRY_RUN}" == "1" ]]; then
  log "dry-run plan nationwide AMS hay/cattle/grain (same /ticks door)"
  log "/ticks, ${_ticks_before}, ${_ticks_before}, ${_ticks_reason}"
elif [[ "${_ticks_action}" == "skip" && "${CHECK_ALL}" != "1" ]]; then
  log "/ticks, ${_ticks_before}, ${_ticks_before}, ${_ticks_reason}"
else
  if [[ "${_ticks_action}" == "skip" ]]; then
    log "hay/cattle check asOf-delta (plan ${_ticks_reason})"
  else
    log "hay/cattle collect"
  fi
  /usr/bin/python3 "$FARM/scripts/collect-prices.py" >>"$LOG" 2>&1 || log "hay/cattle collect failed (exit $?)"
  log "nationwide AMS hay/cattle/grain collect"
  if [[ -f "$MCP/build/ticks-ams.js" ]]; then
    "$NODE_BIN" "$MCP/build/ticks-ams.js" >>"$LOG" 2>&1 || log "nationwide AMS collect failed (exit $?)"
  else
    log "nationwide AMS collect skipped (missing $MCP/build/ticks-ams.js)"
  fi
  plan_fields "$(ticks_snapshot)"
  local_done="refreshed"
  if [[ "${_ticks_action}" == "grow" ]]; then
    local_done="grew"
  elif [[ "${_n}" -eq "${_ticks_before}" ]]; then
    local_done="current"
  fi
  log "/ticks, ${_ticks_before}, ${_n}, ${local_done}"
fi

if imagine_busy; then
  log "stop after hay: Imagine/rmbg became active"
  exit 0
fi

# Official doors from live well-known. Hay /ticks already ran. No frozen N.
list_official_doors() {
  local out source line
  out="$(python3 "$PLAN" --list-official \
    ${WELL_KNOWN_FILE:+--file "$WELL_KNOWN_FILE"} \
    --url "$WELL_KNOWN_URL" \
    --door-src "$DOOR_SRC")" || true
  source="${out%%$'\n'*}"
  DOORS=()
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == "$source" ]] && continue
    DOORS+=("$line")
  done <<<"$out"
  _door_source="${source:-empty}"
}

list_official_doors
if [[ ${#DOORS[@]} -eq 0 ]]; then
  log "official doors 0 from ${_door_source} (well-known + PUBLIC_BAZAAR_SKUS failed)"
else
  log "official doors ${#DOORS[@]} from ${_door_source} (hay /ticks separate)"
fi

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
  if [[ "$action" == "skip" && ( "${DRY_RUN}" == "1" || "${CHECK_ALL}" != "1" ) ]]; then
    log "/${sku}, ${before}, ${before}, ${reason}"
    return 0
  fi
  if imagine_busy; then
    log "stop doors: Imagine/rmbg became active"
    return 1
  fi
  if [[ "$action" == "skip" ]]; then
    log "$sku check n=${before} asOf-delta (plan ${reason})"
  else
    log "$sku $action n=${before} growUntil=${GROW_UNTIL} limit=${GROW_LIMIT}"
  fi
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
  if [[ "$action" == "skip" && "$after" -eq "$before" ]]; then
    done="current"
  elif [[ "$action" == "skip" ]]; then
    done="asof-moved"
  elif [[ "$action" == "grow" && "$after" -le 5 ]]; then
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
