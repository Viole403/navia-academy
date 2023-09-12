#!/usr/bin/env bash
#
# compute-resource-limits.sh — spec-agnostic VPS resource budget.
#
# Computes ONE shared budget from the host's ACTUAL resources and applies it to
# whichever of the two Navia consumers is running. `apps/backend`'s api server
# and `apps/media`'s batch generation NEVER run concurrently (sequential
# operational model: media batch completes first, then api stays up), so each
# is sized for the FULL budget when it is the one running — no fixed split.
#
#   CPU = 90% of logical cores   (provider auto-suspends >95% sustained 6 min;
#                                 we deliberately stay under 90%)
#   RAM = 62% of MemTotal        (rest stays with OS + page cache)
#
# Postgres and Redis are EXTERNAL managed cloud services in production — they
# consume none of this VPS's budget and are intentionally absent here.
#
# Writes to .env (project dir), consumed by docker-compose.yml via ${VAR:-...}:
#
#   API_CPU_LIMIT  API_MEM_LIMIT  API_MEM_LIMIT_BYTES  MEDIA_CPU_LIMIT
#   MEDIA_MEM_LIMIT
#
# API_MEM_LIMIT_BYTES feeds main.go's GOMEMLIMIT wiring (soft limit = 90% of
# this hard cap). Legacy POSTGRES_*/REDIS_* limit keys are removed.
#
# Floors (an app must stay runnable on absurdly small hosts):
#   api >= 192 MB / 0.05 cpu, media >= 256 MB / 0.05 cpu. If a floor binds a
#   warning is printed; totals may exceed budget rather than ship an unrunnable
#   stack.
#
# Baseline sanity: on 1 vCPU / 2048 MB both api and media show ~0.90 CPU /
# ~1269 MB standalone.
#
# Usage:
#   ./scripts/compute-resource-limits.sh [--dry-run]
# Simulate another spec without touching anything:
#   HOST_CPUS=4 HOST_MEM_MB=8192 ./scripts/compute-resource-limits.sh --dry-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# --- detect host spec (or take test overrides) ------------------------------
if [ -n "${HOST_CPUS:-}" ]; then
	NCPU="${HOST_CPUS}"
	CPU_SRC="HOST_CPUS override"
else
	NCPU="$(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN)"
	CPU_SRC="nproc"
fi

if [ -n "${HOST_MEM_MB:-}" ]; then
	MEM_TOTAL_MB="${HOST_MEM_MB}"
	MEM_SRC="HOST_MEM_MB override"
elif [ -r /proc/meminfo ]; then
	MEM_TOTAL_MB="$(awk '/^MemTotal:/ { printf "%d", $2 / 1024 }' /proc/meminfo)"
	MEM_SRC="/proc/meminfo MemTotal"
else
	echo "error: cannot read total memory (no HOST_MEM_MB and no /proc/meminfo)" >&2
	exit 1
fi

# --- single shared computation ----------------------------------------------
# Values floored DOWN (centi-cores / whole MB) so rounding never exceeds budget.
read -r CPU_BUDGET MEM_BUDGET \
	API_CPU API_MEM MEDIA_CPU MEDIA_MEM FLOORED <<EOF
$(awk -v ncpu="$NCPU" -v memmb="$MEM_TOTAL_MB" 'BEGIN {
	cpu_budget = int(ncpu * 0.90 * 100) / 100
	mem_budget = int(memmb * 62 / 100)

	api_cpu   = cpu_budget
	media_cpu = cpu_budget
	api_mem   = mem_budget
	media_mem = mem_budget

	floored = 0
	if (api_cpu   < 0.05) { api_cpu   = 0.05; floored = 1 }
	if (media_cpu < 0.05) { media_cpu = 0.05; floored = 1 }
	if (api_mem   < 192)  { api_mem   = 192;  floored = 1 }
	if (media_mem < 256)  { media_mem = 256;  floored = 1 }

	printf "%.2f %d %.2f %d %.2f %d %d",
		cpu_budget, mem_budget,
		api_cpu, api_mem,
		media_cpu, media_mem,
		floored
}')
EOF

API_MEM_BYTES=$((API_MEM * 1024 * 1024))

echo "== Navia resource budget (api + media, never concurrent) =="
echo "Host:          ${NCPU} vCPU (${CPU_SRC}) / ${MEM_TOTAL_MB} MB RAM (${MEM_SRC})"
if [ -n "${HOST_CPUS:-}" ] || [ -n "${HOST_MEM_MB:-}" ]; then
	echo "               ^ SIMULATED spec — real detection skipped via overrides"
fi
echo "Budget:        ${CPU_BUDGET} CPU (90% of cores) / ${MEM_BUDGET} MB RAM (62% of total)"
echo ""
printf '%-12s %-8s %-9s %-10s\n' "consumer" "cpus" "mem-cap" "when"
printf '%-12s %-8s %-9s %-10s\n' "api" "$API_CPU" "${API_MEM}M" "standalone"
printf '%-12s %-8s %-9s %-10s\n' "media-batch" "$MEDIA_CPU" "${MEDIA_MEM}M" "standalone"
echo "-----------------------------------------------"
echo "Both sized to the FULL budget — only one runs at a time."
echo "API hard cap:  ${API_MEM}M = ${API_MEM_BYTES} bytes (Go soft limit set at 90% of this)"

if [ "$FLOORED" -eq 1 ]; then
	echo "WARNING: host too small for full budget — minimum floors applied." >&2
fi

if [ "$DRY_RUN" -eq 1 ]; then
	echo ""
	echo "DRY RUN — no changes written."
	exit 0
fi

# --- write .env --------------------------------------------------------------
upsert_env() {
	local key="$1" val="$2"
	if grep -qE "^${key}=" "$ENV_FILE"; then
		sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
	else
		printf '%s=%s\n' "$key" "$val" >>"$ENV_FILE"
	fi
}

delete_env() {
	local key="$1"
	sed -i "\|^${key}=.|d" "$ENV_FILE"
}

touch "$ENV_FILE"
upsert_env "API_CPU_LIMIT" "$API_CPU"
upsert_env "API_MEM_LIMIT" "${API_MEM}M"
upsert_env "API_MEM_LIMIT_BYTES" "$API_MEM_BYTES"
upsert_env "MEDIA_CPU_LIMIT" "$MEDIA_CPU"
upsert_env "MEDIA_MEM_LIMIT" "${MEDIA_MEM}M"

# Legacy keys from the pre-external-Postgres topology (compose ran pg/redis).
# Exact-key deletion only — REDIS_URL / DATABASE_URL are unrelated connection
# strings and must survive untouched.
delete_env "POSTGRES_CPU_LIMIT"
delete_env "POSTGRES_MEM_LIMIT"
delete_env "REDIS_CPU_LIMIT"
delete_env "REDIS_MEM_LIMIT"

echo ""
echo "Wrote 5 limit keys to $ENV_FILE (legacy POSTGRES_*/REDIS_* limit keys removed if present)."
