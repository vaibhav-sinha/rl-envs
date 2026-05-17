#!/bin/bash
set -euo pipefail

mkdir -p /data/workspace

hfc_args=(--transport http)
if [ -n "${HFC_INITIAL_FILE:-}" ]; then
  hfc_args+=(--file "$HFC_INITIAL_FILE")
fi

node /opt/hfc/dist/cli.js "${hfc_args[@]}" &
mcp_pid=$!

cleanup() {
  if kill -0 "$mcp_pid" 2>/dev/null; then
    kill "$mcp_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

max_attempts=60
attempt=0
until curl -sf "http://127.0.0.1:${HFC_HTTP_PORT:-3847}/health" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "figma-entrypoint: MCP health check failed after ${max_attempts} attempts" >&2
    exit 1
  fi
  sleep 0.5
done

exec "$@"
