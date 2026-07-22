#!/usr/bin/env bash
#
# On-VPS launch-data refresh (RFC-035).
#
# The launch manifest is served live from the /data overlay (nginx reads
# static/data/), but the VPS only updates it on a manual deploy — so prod goes
# stale between deploys. The GitHub refresh workflow already fetches fresh
# launches every 6h and commits them to main; this script pulls just those data
# files onto the live overlay, so nginx serves them without a redeploy. Keyless,
# no container, no rebuild. Run once per deploy (to prime) and by the deploy@
# crontab every 6h. Safe to run alongside the GitHub cron — both use the same
# committed data.
set -euo pipefail
cd /srv/orrery

git fetch origin main -q
# Overwrite only the data files from the freshly-fetched main; never touch code
# (a deploy handles code). FETCH_HEAD is the just-fetched main tip.
git checkout FETCH_HEAD -- static/data/launches.json static/data/launches-historic

echo "[refresh-prod-data] $(date -u +%FT%TZ) synced launches.json ($(wc -c < static/data/launches.json) bytes)"
