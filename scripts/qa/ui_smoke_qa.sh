#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/output/playwright/smoke"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$ARTIFACT_DIR/ui-smoke-$TIMESTAMP.log"
SESSION="smoke-$RANDOM-$RANDOM"
PW_PACKAGE="@playwright/mcp@0.0.60"
VITE_PID=""

mkdir -p "$ARTIFACT_DIR"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

pw() {
  npx --yes --package "$PW_PACKAGE" playwright-cli --session "$SESSION" "$@"
}

pwctl() {
  npx --yes --package "$PW_PACKAGE" playwright-cli "$@"
}

run() {
  log "$*"
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

run_pw() {
  log "pw $*"
  local output
  output="$(pw "$@" 2>&1 | tee -a "$LOG_FILE")"
  if printf '%s' "$output" | grep -q "### Error"; then
    return 1
  fi
}

run_with_retry() {
  local attempts="$1"
  shift
  local attempt=1

  while true; do
    if "$@"; then
      return 0
    fi
    if (( attempt >= attempts )); then
      return 1
    fi
    attempt=$((attempt + 1))
    log "Retrying ($attempt/$attempts) after transient Playwright CLI failure."
    sleep 1
  done
}

latest_snapshot() {
  ls -t "$ROOT_DIR/.playwright-cli"/page-*.yml 2>/dev/null | head -n1
}

assert_snapshot_contains() {
  local needle="$1"
  local snapshot
  snapshot="$(latest_snapshot)"
  if [[ -z "$snapshot" ]]; then
    log "No snapshot found while asserting: $needle"
    return 1
  fi
  if ! grep -Fq "$needle" "$snapshot"; then
    log "Snapshot assertion failed: '$needle' not found in $snapshot"
    return 1
  fi
}

find_button_ref() {
  local label="$1"
  local snapshot
  snapshot="$(latest_snapshot)"
  if [[ -z "$snapshot" ]]; then
    return 1
  fi
  grep -F "button \"$label\"" "$snapshot" | head -n1 | sed -E 's/.*\[ref=(e[0-9]+)\].*/\1/'
}

find_close_ref_after_heading() {
  local heading="$1"
  local snapshot
  snapshot="$(latest_snapshot)"
  if [[ -z "$snapshot" ]]; then
    return 1
  fi
  local heading_line
  heading_line="$(grep -n "heading \"$heading\"" "$snapshot" | head -n1 | cut -d: -f1)"
  if [[ -z "$heading_line" ]]; then
    return 1
  fi
  sed -n "$((heading_line + 1)),$((heading_line + 25))p" "$snapshot" \
    | grep "button" \
    | grep -Eo '\[ref=e[0-9]+\]' \
    | head -n1 \
    | tr -d '[]' \
    | cut -d= -f2
}

cleanup() {
  if [[ -n "$VITE_PID" ]]; then
    pkill -P "$VITE_PID" >/dev/null 2>&1 || true
    kill "$VITE_PID" >/dev/null 2>&1 || true
  fi

  pwctl session-stop "$SESSION" >/dev/null 2>&1 || true

  if [[ -d "$ROOT_DIR/.playwright-cli" ]]; then
    rm -rf "$ARTIFACT_DIR/cli-$TIMESTAMP"
    mv "$ROOT_DIR/.playwright-cli" "$ARTIFACT_DIR/cli-$TIMESTAMP"
  fi
}
trap cleanup EXIT

if ! curl -sf http://localhost:5173/ >/dev/null 2>&1; then
  log "Starting renderer dev server for smoke QA."
  (
    cd "$ROOT_DIR"
    npm run dev:renderer >"$ARTIFACT_DIR/vite-$TIMESTAMP.log" 2>&1
  ) &
  VITE_PID=$!

  (
    cd "$ROOT_DIR"
    npx wait-on http://localhost:5173/
  )
fi

run_with_retry 3 run_pw open http://localhost:5173/
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "How can I help you today?"

templates_ref="$(find_button_ref "Templates")"
[[ -n "$templates_ref" ]] || { log "Could not find Templates button ref."; exit 1; }
run_with_retry 3 run_pw click "$templates_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Template Library"
template_close_ref="$(find_close_ref_after_heading "Template Library")"
[[ -n "$template_close_ref" ]] || { log "Could not find Template Library close button ref."; exit 1; }
run_with_retry 3 run_pw click "$template_close_ref"
run_with_retry 3 run_pw snapshot

ab_test_ref="$(find_button_ref "A/B Test")"
[[ -n "$ab_test_ref" ]] || { log "Could not find A/B Test button ref."; exit 1; }
run_with_retry 3 run_pw click "$ab_test_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "A/B Testing"
ab_close_ref="$(find_close_ref_after_heading "A/B Testing")"
[[ -n "$ab_close_ref" ]] || { log "Could not find A/B Testing close button ref."; exit 1; }
run_with_retry 3 run_pw click "$ab_close_ref"
run_with_retry 3 run_pw snapshot

models_ref="$(find_button_ref "Models")"
[[ -n "$models_ref" ]] || { log "Could not find Models button ref."; exit 1; }
run_with_retry 3 run_pw click "$models_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Model Manager"

settings_ref="$(find_button_ref "Settings")"
[[ -n "$settings_ref" ]] || { log "Could not find Settings button ref."; exit 1; }
run_with_retry 3 run_pw click "$settings_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Settings Dashboard"

chat_ref="$(find_button_ref "Chat")"
[[ -n "$chat_ref" ]] || { log "Could not find Chat button ref."; exit 1; }
run_with_retry 3 run_pw click "$chat_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "How can I help you today?"

run_with_retry 3 run_pw console warning
run_with_retry 3 run_pw screenshot

log "UI smoke QA completed successfully."
