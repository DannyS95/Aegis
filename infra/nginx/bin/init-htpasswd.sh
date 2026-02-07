#!/usr/bin/env sh
set -euo pipefail

# require caller-provided credentials so we never default to empty auth
: "${TOKEN_PROXY_USER:?TOKEN_PROXY_USER must be set}"
: "${TOKEN_PROXY_PASS:?TOKEN_PROXY_PASS must be set}"

htpasswd_path="/etc/nginx/.htpasswd"
tmp_path="${htpasswd_path}.tmp"

# ensure htpasswd utility exists (provided by apache2-utils)
if ! command -v htpasswd >/dev/null 2>&1; then
  echo "Installing apache2-utils for htpasswd support"
  apk add --no-cache apache2-utils >/dev/null 2>&1
fi

echo "Generating htpasswd entry for ${TOKEN_PROXY_USER}"
# Use bcrypt (-B) instead of apr1/MD5.
# -i reads password from stdin so we avoid exposing it in argv.
printf '%s\n' "$TOKEN_PROXY_PASS" | htpasswd -niB "$TOKEN_PROXY_USER" > "$tmp_path"
chmod 600 "$tmp_path"

# atomic replace keeps nginx happy if the file already exists
mv "$tmp_path" "$htpasswd_path"

# ensure nginx worker can read the credentials file
chown nginx:nginx "$htpasswd_path"

echo "Generated htpasswd at $htpasswd_path"
