#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

production_dir="$tmp_root/production"
preview_dir="$tmp_root/preview"
production_log="$tmp_root/production.log"
preview_log="$tmp_root/preview.log"

if ! hugo --gc --minify --panicOnWarning --baseURL "https://binyleds.test/" --destination "$production_dir" >"$production_log" 2>&1; then
  tail -n 120 "$production_log" >&2
  exit 1
fi

python3 scripts/audit_site.py "$production_dir"

if ! hugo --gc --minify --panicOnWarning \
  --environment staging \
  --disableKinds sitemap \
  --baseURL "https://deploy-preview.binyleds.test/" \
  --destination "$preview_dir" >"$preview_log" 2>&1; then
  tail -n 120 "$preview_log" >&2
  exit 1
fi

python3 scripts/audit_site.py "$preview_dir" --expect-noindex
