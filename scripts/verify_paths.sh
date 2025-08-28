#!/usr/bin/env bash
set -euo pipefail
echo "[verify] Checking paths and case..."
test -f function/host.json || { echo "function/host.json missing"; exit 1; }
test -f function/index.js || { echo "function/index.js missing"; exit 1; }
test -f function/functions/mailer.js || { echo "function/functions/mailer.js missing (case-sensitive)"; exit 1; }
echo "[verify] Git tracked files (look for duplicates differing only by case):"
git ls-files | sort
echo "[verify] OK"
