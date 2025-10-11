#!/usr/bin/env sh
set -e

/init/init-htpasswd.sh

exec nginx -g 'daemon off;'
