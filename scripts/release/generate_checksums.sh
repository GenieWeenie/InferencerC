#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="${1:-$ROOT_DIR/release-artifacts}"
OUTPUT_PATH="${2:-$ROOT_DIR/output/release/checksums.sha256}"
# Resolve relative paths from repo root so script works from any cwd (e.g. in CI)
[[ "$TARGET_DIR" != /* ]] && TARGET_DIR="$ROOT_DIR/$TARGET_DIR"
[[ "$OUTPUT_PATH" != /* ]] && OUTPUT_PATH="$ROOT_DIR/$OUTPUT_PATH"

mkdir -p "$(dirname "$OUTPUT_PATH")"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Release artifacts directory not found: $TARGET_DIR" >&2
  exit 1
fi

cd "$TARGET_DIR"

mapfile -t FILES < <(find . -type f ! -name 'checksums.sha256' | sort)
if [[ "${#FILES[@]}" -eq 0 ]]; then
  echo "No release artifact files found in $TARGET_DIR" >&2
  exit 1
fi

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${FILES[@]}" > "$OUTPUT_PATH"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${FILES[@]}" > "$OUTPUT_PATH"
else
  echo "Neither shasum nor sha256sum is available on this runner." >&2
  exit 1
fi

echo "Generated checksum manifest: $OUTPUT_PATH"
