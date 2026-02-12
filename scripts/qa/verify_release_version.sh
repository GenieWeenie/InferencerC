#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${GITHUB_REF:-}" != refs/tags/* ]]; then
  echo "Skipping release version check (not a tag build)."
  exit 0
fi

TAG_NAME="${GITHUB_REF_NAME:-${GITHUB_REF#refs/tags/}}"
if [[ -z "$TAG_NAME" ]]; then
  echo "Unable to determine tag name from GITHUB_REF/GITHUB_REF_NAME." >&2
  exit 1
fi

EXPECTED_VERSION="${TAG_NAME#v}"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"

if [[ "$PACKAGE_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "Release version mismatch." >&2
  echo "Tag: $TAG_NAME (expects package version: $EXPECTED_VERSION)" >&2
  echo "package.json version: $PACKAGE_VERSION" >&2
  exit 1
fi

echo "Release version check passed: tag $TAG_NAME matches package.json version $PACKAGE_VERSION."
