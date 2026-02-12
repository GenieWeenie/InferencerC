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

assert_snapshot_contains_any() {
  local snapshot
  snapshot="$(latest_snapshot)"
  if [[ -z "$snapshot" ]]; then
    log "No snapshot found while asserting one-of patterns."
    return 1
  fi

  for needle in "$@"; do
    if grep -Fq "$needle" "$snapshot"; then
      return 0
    fi
  done

  log "Snapshot assertion failed: none of the expected values were found in $snapshot"
  return 1
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

assert_no_runtime_import_errors() {
  log "Checking browser console for runtime import/white-screen blockers."
  local output
  output="$(pw console error 2>&1 | tee -a "$LOG_FILE")" || return 1

  if printf '%s' "$output" | grep -Eiq \
    "Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk [0-9]+ failed|ERR_CONNECTION_REFUSED"; then
    log "Detected runtime import/network fatal errors in console output."
    return 1
  fi
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
assert_snapshot_contains_any "How can I help you today?" "Type your prompt here"
assert_snapshot_contains "Model:"
assert_no_runtime_import_errors

# 1) Model switch flow
MODEL_SWITCH_CODE="$(cat <<'EOF'
async (page) => {
  return await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent || '').trim() === 'Model:');
    const container = label ? label.parentElement : null;
    const select = (container && container.querySelector('select')) || document.querySelector('select');
    if (!select) {
      throw new Error('Model selector not found');
    }

    const options = Array.from(select.options || []).filter((option) => !option.disabled && typeof option.value === 'string');
    if (options.length === 0) {
      return {
        switched: false,
        reason: 'no-options',
        optionCount: 0,
        currentValue: select.value
      };
    }

    const currentValue = select.value;
    const target = options.find((option) => option.value !== currentValue) || options[0];
    if (!target || target.value === currentValue) {
      return {
        switched: false,
        reason: 'single-option',
        optionCount: options.length,
        currentValue
      };
    }
    select.value = target.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      currentValue,
      nextValue: target.value,
      switched: target.value !== currentValue,
      optionCount: options.length
    };
  });
}
EOF
)"
run_with_retry 3 run_pw run-code "$MODEL_SWITCH_CODE"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Model:"

# 2) Send prompt flow
SEND_PROMPT_CODE="$(cat <<'EOF'
async (page) => {
  const text = 'Smoke QA prompt from CI';
  const editor = page.locator('textarea').last();
  await editor.fill(text);
  await editor.press('Enter');
  await page.waitForTimeout(1500);
  return text;
}
EOF
)"
run_with_retry 3 run_pw run-code "$SEND_PROMPT_CODE"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Smoke QA prompt from CI"

# 3) Inspector open flow
inspector_ref="$(find_button_ref "Inspector")"
[[ -n "$inspector_ref" ]] || { log "Could not find Inspector button ref."; exit 1; }
run_with_retry 3 run_pw click "$inspector_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Inspector"

# 4) Settings usage flow
settings_ref="$(find_button_ref "Settings")"
[[ -n "$settings_ref" ]] || { log "Could not find Settings button ref."; exit 1; }
run_with_retry 3 run_pw click "$settings_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Settings Dashboard"

usage_ref="$(find_button_ref "Usage")"
[[ -n "$usage_ref" ]] || { log "Could not find Usage tab button ref."; exit 1; }
run_with_retry 3 run_pw click "$usage_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Token Usage & Cost Tracking"

chat_ref="$(find_button_ref "Chat")"
[[ -n "$chat_ref" ]] || { log "Could not find Chat button ref."; exit 1; }
run_with_retry 3 run_pw click "$chat_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains_any "Smoke QA prompt from CI" "How can I help you today?"

assert_no_runtime_import_errors
run_with_retry 3 run_pw screenshot

log "UI smoke QA completed successfully."
