#!/usr/bin/env sh
set -eu

: "${BACKEND_UPSTREAM:=http://backend:8000}"
export BACKEND_UPSTREAM

envsubst '${BACKEND_UPSTREAM}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
