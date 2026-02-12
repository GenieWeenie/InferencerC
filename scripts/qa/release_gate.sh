#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
  echo "[$(date +%H:%M:%S)] $*"
}

run() {
  log "$*"
  "$@"
}

cd "$ROOT_DIR"

run npm test -- --runInBand
run npm run lint
run npm run typecheck
run npm run build
run npm run qa:smoke:ui

log "Release gate passed."
