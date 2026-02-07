#!/bin/sh
set -eu

LOCKFILE="package-lock.json"
HASH_FILE="node_modules/.deps-lock-hash"

if [ ! -f "$LOCKFILE" ]; then
  echo "Missing $LOCKFILE; cannot install dependencies." >&2
  exit 1
fi

mkdir -p node_modules

LOCK_HASH="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
INSTALLED_HASH=""

if [ -f "$HASH_FILE" ]; then
  INSTALLED_HASH="$(cat "$HASH_FILE")"
fi

if [ "$LOCK_HASH" != "$INSTALLED_HASH" ]; then
  echo "Installing npm dependencies (first run or lockfile changed)..."
  npm ci
  printf '%s\n' "$LOCK_HASH" > "$HASH_FILE"
fi

npx prisma generate
exec npm run start:debug
