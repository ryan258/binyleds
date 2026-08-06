#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

build_log="/tmp/binyleds-hugo-build.log"
if ! hugo --gc --minify --panicOnWarning --baseURL "https://binyleds.test/" >"$build_log" 2>&1; then
  tail -n 120 "$build_log" >&2
  exit 1
fi

python3 scripts/audit_site.py

