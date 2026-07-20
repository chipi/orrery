#!/usr/bin/env bash
#
# Import the Orrery dashboards into the self-hosted Grafana.
#
# RFC-025 / ADR-068. Imports the orrery-*.json dashboards (Overview, Web,
# Pipelines) into the `orrery` folder via the Grafana HTTP API. Idempotent —
# re-imports update by `uid`. All panels query VictoriaLogs (LogsQL).
#
# Auth: GRAFANA_HTTP_URL + GRAFANA_API_TOKEN env vars. Point at the homelab
# Grafana (tailnet), e.g. http://homelab:3000. Create a service-account
# token with `Editor` role under Administration → Service accounts.
# GRAFANA_FOLDER_UID selects the target folder (default `orrery`).
#
# Usage:
#   GRAFANA_HTTP_URL=http://homelab:3000 \
#   GRAFANA_API_TOKEN=glsa_... \
#     ./ops/observability/dashboards/import.sh
#
# Idempotency: the dashboards include a stable `uid` field; Grafana
# treats subsequent imports as updates rather than creating duplicates.
# If `overwrite: true` is omitted Grafana rejects a re-import with the
# same uid; we always pass it.

set -euo pipefail

: "${GRAFANA_HTTP_URL:?Set GRAFANA_HTTP_URL=http://homelab:3000}"
: "${GRAFANA_API_TOKEN:?Set GRAFANA_API_TOKEN=<service-account-token>}"
FOLDER_UID="${GRAFANA_FOLDER_UID:-orrery}"

DIR="$(cd "$(dirname "$0")" && pwd)"

for dash in "$DIR"/*.json; do
  name="$(basename "$dash")"
  echo "→ Importing $name"

  # Wrap the bare dashboard JSON in Grafana's import envelope, into the
  # orrery folder.
  body="$(jq --argjson d "$(cat "$dash")" --arg folder "$FOLDER_UID" \
    '{dashboard: $d, overwrite: true, folderUid: $folder, message: "Imported from ops/observability/dashboards (RFC-025)"}' \
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
