#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Cleaning generated artifacts..."
rm -rf dist output .playwright-cli

echo "Cleaning transient logs..."
rm -f dev-server.log test_output.txt

echo "Workspace cleanup complete."
