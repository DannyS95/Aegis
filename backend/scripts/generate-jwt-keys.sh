#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[error] Environment file not found: $ENV_FILE" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[error] openssl is required but not installed" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PRIVATE_PEM="$TMP_DIR/jwt_private.pem"
PUBLIC_PEM="$TMP_DIR/jwt_public.pem"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_PEM" >/dev/null 2>&1
openssl pkey -in "$PRIVATE_PEM" -pubout -out "$PUBLIC_PEM" >/dev/null 2>&1

if ! command -v python3 >/dev/null 2>&1; then
  echo "[error] python3 is required but not installed" >&2
  exit 1
fi

python3 "$ROOT_DIR/scripts/update_env_jwt_keys.py" "$ENV_FILE" "$PRIVATE_PEM" "$PUBLIC_PEM"

echo "Generated new RSA keypair and updated $ENV_FILE"
