#!/usr/bin/env bash
#
# On-VPS launch-data refresh (RFC-035, true B2 — no GitHub in the loop).
#
# Runs the launch fetch INSIDE the pipeline-runner container, straight from the
# upstream sources (Launch Library 2, GCAT, NASA, SpaceX, ESA — all keyless),
# writing the /data overlay nginx serves live. No rebuild, no redeploy, no
# GitHub. Invoked once per deploy (to prime) and by the deploy@ crontab every
# 6h.
#
# Safety: a total upstream failure makes the fetch write an (near-)empty
# launches.json, which would blank the live launch list. So we back up the
# current file, run the fetch, and keep the result only if it's plausibly
# non-empty — otherwise restore the backup.
set -euo pipefail
cd /srv/orrery

COMPOSE=(docker compose -f compose/docker-compose.prod.yml --project-directory . --env-file .env --profile manual run --rm pipeline-runner)
LIVE=static/data/launches.json
BAK="${LIVE}.prev"
MIN_BYTES=10000 # a healthy manifest is ~500 KB; an empty/failed one is ~100 B

cp -f "$LIVE" "$BAK" 2>/dev/null || true

if "${COMPOSE[@]}" scripts/fetch-launches.ts && [ "$(wc -c < "$LIVE")" -ge "$MIN_BYTES" ]; then
  # nginx serves /data with brotli_static + gzip_static, i.e. it prefers a
  # precompressed .br/.gz sibling if one exists. The deploy ships those (built
  # from the old data), but the fetch only rewrites the plain .json — so nginx
  # would keep serving the STALE compressed copy. Drop the precompressed
  # siblings of every file the fetch regenerates; nginx then gzips the fresh
  # .json on the fly (its documented behaviour for the dynamic /data path).
  rm -f static/data/launches.json.gz static/data/launches.json.br \
        static/data/launches-historic/*.json.gz static/data/launches-historic/*.json.br \
        static/data/missions/index.json.gz static/data/missions/index.json.br 2>/dev/null || true
  rm -f "$BAK"
  echo "[refresh-prod-data] $(date -u +%FT%TZ) ok — launches.json $(wc -c < "$LIVE") bytes"
else
  echo "[refresh-prod-data] $(date -u +%FT%TZ) FETCH FAILED or empty — restoring previous launches.json" >&2
  [ -f "$BAK" ] && mv -f "$BAK" "$LIVE"
  exit 1
fi
