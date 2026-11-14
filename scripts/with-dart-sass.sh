#!/usr/bin/env bash
set -euo pipefail

if (( $# == 0 )); then
  printf 'Usage: bash scripts/with-dart-sass.sh COMMAND [ARG ...]\n' >&2
  exit 2
fi

version=1.106.1
if [[ "$(sass --version 2>/dev/null || true)" == "$version" ]] &&
    sass --embedded --version >/dev/null 2>&1; then
  exec "$@"
fi

# Hosted builds use the native Sass executable and the upstream release digests.
case "$(uname -s):$(uname -m)" in
  Linux:x86_64)
    platform=linux-x64
    digest=ad99cccb90de4ad2926e03e32d819c83baf32c3dbff56da92df0eed10e604d60
    ;;
  Linux:aarch64)
    platform=linux-arm64
    digest=07fd42fd0263bbd895f801520d6838171d21bfe3686f63763b8cbbcf51e83360
    ;;
  *)
    printf 'Install native Dart Sass %s on PATH for this platform.\n' "$version" >&2
    exit 1
    ;;
esac

tool_dir="$(mktemp -d)"
trap 'rm -rf "$tool_dir"' EXIT
archive="dart-sass-$version-$platform.tar.gz"
curl --fail --silent --show-error --location \
  "https://github.com/sass/dart-sass/releases/download/$version/$archive" \
  --output "$tool_dir/$archive"
if ! printf '%s  %s\n' "$digest" "$tool_dir/$archive" | sha256sum --check --status; then
  printf 'Dart Sass checksum verification failed for %s.\n' "$archive" >&2
  exit 1
fi
tar -xzf "$tool_dir/$archive" -C "$tool_dir"

PATH="$tool_dir/dart-sass:$PATH" "$@"
