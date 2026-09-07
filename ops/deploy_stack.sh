#!/usr/bin/env bash
# deploy_stack.sh — bring up the orrery stack on the VPS (run as deploy@ from
# /srv/orrery AFTER the workflow's `git fetch + reset --hard origin/main`, so
# this file is the fresh checkout). Extracted from deploy-prod.yml's inline ssh
# (Fable-5: the gated whole-stack bring-up + state bootstrap outgrew a safely
# escaped one-liner). Idempotent; safe to re-run.
#
# Brings up web ALWAYS; mcp + lab-api ONLY when their auth secrets are present in
# .env — lab-api's assertProductionConfig throws without them, which under
# restart:unless-stopped is a crash-loop, so a secrets-less deploy degrades to
# web-only + a warning instead of reddening the run (Fable-5 B2).
set -euo pipefail
cd /srv/orrery

COMPOSE=(docker compose -f compose/docker-compose.prod.yml --project-directory . --env-file .env)

# ── Observability: drop orrery's log rules into the shared node Alloy + HUP
#    (ADR-121); remove the retired per-app agent so logs don't double-collect.
touch data-refresh.log
cp ops/observability/orrery.alloy /opt/vps-observability/config.d/orrery.alloy
docker rm -f orrery-grafana-agent 2>/dev/null || true
docker kill -s HUP alloy 2>/dev/null || true

# ── Warm caches + (re)build the web image.
"${COMPOSE[@]}" --profile manual pull pipeline-runner
"${COMPOSE[@]}" build web

# ── lab-api state bootstrap (idempotent; Fable-5 M3). Create the state dir +
#    seed allowlist.json AS deploy@ (0644 — the container only readFileSyncs it),
#    then chown to the container's labapi uid THROUGH docker (deploy@ has no
#    CAP_CHOWN but is in the docker group) with group=deploy + 770 so the operator
#    can still edit the allowlist over SSH; the container writes state.json (0600
#    private key) via owner bits. allowlist is read per-request, not at boot —
#    no seed/boot race.
ALLOW_EMAIL="${ORRERY_LAB_ALLOWLIST_EMAIL:-marko.dragoljevic@gmail.com}"
mkdir -p lab-api-state
if [ ! -f lab-api-state/allowlist.json ]; then
  printf '{"emails":["%s"]}\n' "$ALLOW_EMAIL" > lab-api-state/allowlist.json
  echo "seeded lab-api-state/allowlist.json"
fi
chmod 0644 lab-api-state/allowlist.json
LAB_API_TAG="$(grep -E '^ORRERY_LAB_API_IMAGE_TAG=' .env | cut -d= -f2-)"
LAB_API_TAG="${LAB_API_TAG:-main}"
LABUID="$(docker run --rm "ghcr.io/chipi/orrery-lab-api:${LAB_API_TAG}" id -u 2>/dev/null || echo '')"
if [ -n "$LABUID" ]; then
  docker run --rm -v /srv/orrery/lab-api-state:/s alpine:3.20 \
    sh -c "chown -R ${LABUID}:$(id -g) /s && chmod 770 /s" || true
fi

# ── Whole-stack up, gated on lab-api secrets present (Fable-5 B2).
have() { grep -qE "^$1=..*" .env; }
if have ORRERY_LAB_GOOGLE_CLIENT_ID && have ORRERY_LAB_GOOGLE_CLIENT_SECRET && have ORRERY_LAB_CLAUDE_CLIENT_SECRET; then
  echo "::notice::lab-api secrets present — bringing up web + mcp + lab-api"
  "${COMPOSE[@]}" pull mcp lab-api
  "${COMPOSE[@]}" up -d web mcp lab-api
  STACK=full
else
  echo "::warning::lab-api auth secrets absent — bringing up web only (set ORRERY_LAB_GOOGLE_CLIENT_ID/SECRET + ORRERY_LAB_CLAUDE_CLIENT_SECRET in prod secrets, then re-deploy)"
  "${COMPOSE[@]}" up -d web
  STACK=web
fi

# ── Healthchecks (loopback; Caddy fronts these publicly).
wait_ok() { # name url
  local name="$1" url="$2"
  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then echo "$name OK"; return 0; fi
    sleep 2
  done
  echo "$name did not respond within 60s"
  "${COMPOSE[@]}" logs "$name"
  return 1
}

PORT="$(grep -E '^ORRERY_PORT=' .env | cut -d= -f2-)"; PORT="${PORT:-8090}"
wait_ok web "http://127.0.0.1:${PORT}/"
if [ "$STACK" = full ]; then
  wait_ok lab-api "http://127.0.0.1:8093/jwks"
  wait_ok mcp "http://127.0.0.1:8091/health"
fi
echo "deploy_stack: $STACK stack up"
