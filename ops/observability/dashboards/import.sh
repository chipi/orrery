#!/usr/bin/env bash
#
# Import Orrery dashboards into a Grafana instance.
#
# RFC-025 / ADR-068. Imports orrery-web-access.json + orrery-pipelines.json
# via the Grafana HTTP API. Idempotent — re-imports update by `uid`.
#
# Auth: GRAFANA_HTTP_URL + GRAFANA_API_TOKEN env vars. For Grafana
# Cloud the URL is your stack's "Grafana" endpoint (e.g.
# https://<stack>.grafana.net). Create a service-account token with
# `Editor` role under Administration → Service accounts → Add token.
#
# Usage:
#   GRAFANA_HTTP_URL=https://<stack>.grafana.net \
#   GRAFANA_API_TOKEN=glsa_... \
#     ./ops/observability/dashboards/import.sh
#
# Idempotency: the dashboards include a stable `uid` field; Grafana
# treats subsequent imports as updates rather than creating duplicates.
# If `overwrite: true` is omitted Grafana rejects a re-import with the
# same uid; we always pass it.

set -euo pipefail

: "${GRAFANA_HTTP_URL:?Set GRAFANA_HTTP_URL=https://<stack>.grafana.net}"
: "${GRAFANA_API_TOKEN:?Set GRAFANA_API_TOKEN=<service-account-token>}"

DIR="$(cd "$(dirname "$0")" && pwd)"

for dash in "$DIR"/*.json; do
  name="$(basename "$dash")"
  echo "→ Importing $name"

  # Wrap the bare dashboard JSON in Grafana's import envelope.
  body="$(jq --argjson d "$(cat "$dash")" \
    '{dashboard: $d, overwrite: true, message: "Imported from ops/observability/dashboards (RFC-025)"}' \
    <<< '{}')"

  resp="$(curl -sf -X POST \
    -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$GRAFANA_HTTP_URL/api/dashboards/db")"

  uid="$(jq -r .uid <<< "$resp")"
  url="$(jq -r .url <<< "$resp")"
  echo "  ✓ uid=$uid url=$GRAFANA_HTTP_URL$url"
done

echo
echo "Done. Visit $GRAFANA_HTTP_URL/dashboards to browse."
