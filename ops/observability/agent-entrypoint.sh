#!/bin/sh
#
# Grafana Agent entrypoint — picks a config based on whether the
# operator has populated Grafana Cloud credentials.
#
# RFC-025 / ADR-068. The agent's YAML schema requires a `clients` block
# with a non-empty URL or it crashes in a restart loop. When the
# operator hasn't set GRAFANA_CLOUD_* env vars (the local-dev default),
# this script swaps in a minimal config with NO clients block so the
# agent starts cleanly and ships nothing.
#
# When all three creds are populated, runs the real config.

set -e

# An sh-portable check: are all three vars set + non-empty?
if [ -n "${GRAFANA_CLOUD_LOKI_URL:-}" ] && \
   [ -n "${GRAFANA_CLOUD_LOKI_USER:-}" ] && \
   [ -n "${GRAFANA_CLOUD_API_KEY:-}" ]; then
  echo "[agent-entrypoint] Grafana Cloud creds present → starting with shipping config"
  exec /bin/grafana-agent -config.file=/etc/grafana-agent.yaml -config.expand-env=true
else
  echo "[agent-entrypoint] Grafana Cloud creds NOT present → starting in silent mode (no shipping)"
  exec /bin/grafana-agent -config.file=/etc/grafana-agent.silent.yaml
fi
