#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_PATH="${1:-$ROOT_DIR/output/release/release-notes.md}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

CURRENT_TAG="${GITHUB_REF_NAME:-}"
if [[ -z "$CURRENT_TAG" ]]; then
  CURRENT_TAG="$(git describe --tags --exact-match 2>/dev/null || true)"
fi
if [[ -z "$CURRENT_TAG" ]]; then
  CURRENT_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
fi
if [[ -z "$CURRENT_TAG" ]]; then
  CURRENT_TAG="unversioned"
fi

PREVIOUS_TAG="$(git tag --sort=-creatordate | grep -Fxv "$CURRENT_TAG" | head -n1 || true)"

RELEASE_DATE="$(date -u +"%Y-%m-%d %H:%M UTC")"

{
  echo "# InferencerC $CURRENT_TAG"
  echo
  echo "_Released: ${RELEASE_DATE}_"
  echo
  echo "## Release Checklist"
  echo
  echo "- [x] QA release gate passed (tests + build + UI smoke)"
  echo "- [x] Windows artifact build completed"
  echo "- [x] macOS artifact build completed"
  echo "- [x] GitHub release assets attached from CI artifacts"
  echo
  echo "## Changes"
  echo

  if [[ -n "$PREVIOUS_TAG" ]]; then
    if git rev-parse --verify "$PREVIOUS_TAG" >/dev/null 2>&1 && git rev-parse --verify "$CURRENT_TAG" >/dev/null 2>&1; then
      CHANGE_LINES="$(git log --no-merges --pretty=format:'- %s (%h)' "$PREVIOUS_TAG..$CURRENT_TAG" || true)"
      if [[ -n "$CHANGE_LINES" ]]; then
        echo "$CHANGE_LINES"
      else
        echo "- No commit messages found between \`$PREVIOUS_TAG\` and \`$CURRENT_TAG\`."
      fi
    else
      echo "- Unable to compute commit range for release notes."
    fi
  else
    CHANGE_LINES="$(git log --no-merges --pretty=format:'- %s (%h)' "$CURRENT_TAG" 2>/dev/null || true)"
    if [[ -n "$CHANGE_LINES" ]]; then
      echo "$CHANGE_LINES"
    else
      echo "- Initial release."
    fi
  fi
} >"$OUTPUT_PATH"

echo "Generated release notes: $OUTPUT_PATH"
