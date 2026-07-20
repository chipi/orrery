#!/bin/sh
#
# Grafana Agent entrypoint — picks a config based on whether a Loki push
# target is set.
#
# RFC-025 / ADR-068. The agent's YAML schema requires a `clients` block
# with a non-empty URL or it crashes in a restart loop. When
# GRAFANA_CLOUD_LOKI_URL is unset (the default), this script swaps in a
# minimal config with NO clients block so the agent starts cleanly and
# ships nothing.
#
# The backend is now self-hosted VictoriaLogs on the tailnet (no auth) —
# only the push URL is required; the old GRAFANA_CLOUD_LOKI_USER /
# GRAFANA_CLOUD_API_KEY basic-auth creds are no longer used. See the
# homelab orrery-o11y-handover.md.

set -e

# Ship when a push URL is set; VictoriaLogs on the tailnet needs no auth.
if [ -n "${GRAFANA_CLOUD_LOKI_URL:-}" ]; then
  echo "[agent-entrypoint] Loki push URL present → starting with shipping config"
  exec /bin/grafana-agent -config.file=/etc/grafana-agent.yaml -config.expand-env=true
else
  echo "[agent-entrypoint] No Loki push URL → starting in silent mode (no shipping)"
  exec /bin/grafana-agent -config.file=/etc/grafana-agent.silent.yaml
fi
