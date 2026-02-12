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

ANALYTICS_ENABLE_CODE="$(cat <<'EOF'
async (page) => {
  return await page.evaluate(() => {
    localStorage.setItem('app_privacy_mode', 'false');
    localStorage.setItem('app_analytics_enabled', 'true');
    return { analyticsEnabled: true };
  });
}
EOF
)"
run_with_retry 3 run_pw run-code "$ANALYTICS_ENABLE_CODE"

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
      window.__smokeModelSwitch = {
        switched: false,
        expectedModel: currentValue,
      };
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
    window.__smokeModelSwitch = {
      switched: target.value !== currentValue,
      expectedModel: target.value,
      previousModel: currentValue,
    };
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
  const editor = page.getByPlaceholder("Type your prompt here... (Try '/')").first();
  await editor.fill(text);
  await editor.press('Enter');
  await page.waitForTimeout(300);
  const remaining = await editor.inputValue();
  if (remaining.trim() === text) {
    const sendButton = editor.locator('xpath=ancestor::div[1]/following-sibling::div//button').last();
    if (await sendButton.count()) {
      await sendButton.click();
    }
  }
  await page.waitForTimeout(2500);
  return text;
}
EOF
)"
run_with_retry 3 run_pw run-code "$SEND_PROMPT_CODE"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Smoke QA prompt from CI"

ANALYTICS_ATTRIBUTION_CODE="$(cat <<'EOF'
async (page) => {
  return await page.evaluate(() => {
    const switchedModel = typeof window.__smokeModelSwitch?.expectedModel === 'string'
      ? window.__smokeModelSwitch.expectedModel.trim()
      : '';
    const label = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent || '').trim() === 'Model:');
    const container = label ? label.parentElement : null;
    const modelSelect = (container && container.querySelector('select')) || null;
    const selectedModel = switchedModel
      || (typeof modelSelect?.value === 'string' ? modelSelect.value.trim() : '');

    const rawActivity = localStorage.getItem('api_activity_log_entries');
    if (rawActivity) {
      const activityRows = JSON.parse(rawActivity);
      if (Array.isArray(activityRows)) {
        const invalidActivityRows = activityRows.some((entry) =>
          entry && entry.type === 'request' && (typeof entry.model !== 'string' || entry.model.trim().length === 0)
        );
        if (invalidActivityRows) {
          throw new Error('API activity request rows include missing model attribution.');
        }
      }
    }

    const rawAnalytics = localStorage.getItem('inferencer-analytics');
    if (rawAnalytics) {
      const analyticsRows = JSON.parse(rawAnalytics);
      if (Array.isArray(analyticsRows)) {
        const invalidAnalyticsRows = analyticsRows.some((entry) =>
          !entry || typeof entry.modelId !== 'string' || entry.modelId.trim().length === 0
        );
        if (invalidAnalyticsRows) {
          throw new Error('inferencer-analytics contains rows without modelId attribution.');
        }
      }
    }

    return {
      selectedModel: selectedModel || 'unresolved',
      hasActivityRows: Boolean(rawActivity),
      hasAnalyticsRows: Boolean(rawAnalytics),
    };
  });
}
EOF
)"
run_with_retry 3 run_pw run-code "$ANALYTICS_ATTRIBUTION_CODE"

# 3) Inspector open flow
inspector_ref="$(find_button_ref "Inspector")"
[[ -n "$inspector_ref" ]] || { log "Could not find Inspector button ref."; exit 1; }
run_with_retry 3 run_pw click "$inspector_ref"
run_with_retry 3 run_pw snapshot
assert_snapshot_contains "Inspector"

INSPECTOR_ALTERNATIVE_LABELS_CODE="$(cat <<'EOF'
async (page) => {
  const tokenLocator = page.locator('[title^="Token:"]').first();
  const hasToken = (await tokenLocator.count()) > 0;
  if (hasToken) {
    await tokenLocator.click();
    await page.waitForTimeout(300);
  }
  const inspectorText = await page.evaluate(() => {
    const panel = Array.from(document.querySelectorAll('div')).find((node) => {
      const text = node.textContent || '';
      return text.includes('Top Alternatives');
    });
    const inspectorRoot = Array.from(document.querySelectorAll('div')).find((node) => {
      const text = node.textContent || '';
      return text.includes('Inspect Token Details') || text.includes('Selected Token');
    });
    return {
      alternativesText: panel?.textContent || '',
      inspectorText: inspectorRoot?.textContent || '',
    };
  });
  if (inspectorText.alternativesText.includes('"alt1"') || inspectorText.alternativesText.includes('"alt2"')) {
    throw new Error('Inspector alternatives are showing placeholder labels (alt1/alt2).');
  }
  return { inspectorValidated: true, hasToken };
}
EOF
)"
run_with_retry 3 run_pw run-code "$INSPECTOR_ALTERNATIVE_LABELS_CODE"

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

MODEL_PERSISTENCE_CHECK_CODE="$(cat <<'EOF'
async (page) => {
  return await page.evaluate(() => {
    const expectedModel = window.__smokeModelSwitch?.expectedModel;
    if (!expectedModel) {
      return { checked: false, reason: 'no-switched-model' };
    }
    const label = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent || '').trim() === 'Model:');
    const container = label ? label.parentElement : null;
    const select = (container && container.querySelector('select')) || document.querySelector('select');
    if (!select) {
      throw new Error('Model selector not found when validating persistence.');
    }
    if (select.value !== expectedModel) {
      throw new Error(`Model did not persist after navigation. Expected "${expectedModel}", got "${select.value}".`);
    }
    return {
      checked: true,
      expectedModel,
      currentModel: select.value,
    };
  });
}
EOF
)"
run_with_retry 3 run_pw run-code "$MODEL_PERSISTENCE_CHECK_CODE"

assert_no_runtime_import_errors
run_with_retry 3 run_pw screenshot

log "UI smoke QA completed successfully."
