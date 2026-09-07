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
# Seed the allowlist only if absent. On a re-run the dir + file already exist and
# are owned by the container's labapi uid (chowned below on a prior run), so
# deploy@ must NOT chmod/chown them directly — that EPERMs. All ownership + perms
# are set through docker (root-in-container) instead: labapi owns it so the
# container reads/writes state.json + the 0600 key; group=deploy + 770 dir /
# 660 allowlist so the operator can still edit the allowlist over SSH.
if [ ! -f lab-api-state/allowlist.json ]; then
  printf '{"emails":["%s"]}\n' "$ALLOW_EMAIL" > lab-api-state/allowlist.json
  echo "seeded lab-api-state/allowlist.json"
fi
LAB_API_TAG="$(grep -E '^ORRERY_LAB_API_IMAGE_TAG=' .env | cut -d= -f2- || true)"
LAB_API_TAG="${LAB_API_TAG:-main}"
LABUID="$(docker run --rm "ghcr.io/chipi/orrery-lab-api:${LAB_API_TAG}" id -u 2>/dev/null || echo '')"
DEPLOY_GID="$(id -g)"
if [ -n "$LABUID" ]; then
  docker run --rm -v /srv/orrery/lab-api-state:/s alpine:3.20 sh -c \
    "chown -R ${LABUID}:${DEPLOY_GID} /s && chmod 770 /s && chmod 660 /s/allowlist.json" || true
fi

# ── Whole-stack up, gated on lab-api secrets present (Fable-5 B2).
have() { grep -qE "^$1=..*" .env; }
if have ORRERY_LAB_GOOGLE_CLIENT_ID && have ORRERY_LAB_GOOGLE_CLIENT_SECRET && have ORRERY_LAB_CLAUDE_CLIENT_SECRET; then
  echo "::notice::lab-api secrets present — bringing up web + mcp + lab-api"
  # A prior partial bring-up can leave orrery-mcp/orrery-lab-api holding their
  # loopback ports (8091/8093) in a way `up -d` can't rebind ("port is already
  # allocated"). Log what holds them, then force-remove OUR OWN backend
  # containers only (never web, never podcast) so the recreate binds cleanly.
  # Idempotent + forward-safe: these are additive services, nothing depends on
  # the old instance being up.
  # Full host-port table — the box is a SHARED co-tenant machine and the ADR-114
  # map is not authoritative, so always SEE every binding, not just ours.
  echo "--- all container host-port bindings on this box:"
  docker ps --format '  {{.Names}}  {{.Status}}  {{.Ports}}'
  # Clear our OWN stale backend containers so a re-deploy can rebind (name-scoped
  # — never touches a co-tenant container).
  docker rm -f orrery-mcp orrery-lab-api >/dev/null 2>&1 || true
  # Verify our host ports are actually free before binding (mcp 8091, lab-api
  # 8094). A NON-orrery holder is a squatter to route around, not fight: fail
  # loudly naming it so the port is bumped in one edit (compose + Caddy upstream).
  for pp in 8091:mcp 8094:lab-api; do
    port="${pp%%:*}"; svc="${pp##*:}"
    holder="$(docker ps --format '{{.Names}} {{.Ports}}' | grep "127.0.0.1:${port}->" | grep -v "orrery-${svc}" || true)"
    if [ -n "$holder" ]; then
      echo "::error::host port ${port} (orrery ${svc}) is held by a co-tenant: ${holder} — bump orrery's ${svc} host port + its Caddy upstream"
      exit 1
    fi
  done
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
  wait_ok lab-api "http://127.0.0.1:8094/jwks"
  wait_ok mcp "http://127.0.0.1:8091/health"
  # Verify the /ask path end-to-end at the network level: can lab-api actually
  # reach the LiteLLM gateway? Non-fatal (a broken LLM path shouldn't fail the
  # whole deploy) but logged, so it's visible without a user token. host.docker
  # .internal can't reach the gateway's 127.0.0.1 bind from a bridge container —
  # this is why LITELLM_BASE_URL points at the box's tailnet IP (#464).
  LLM_URL="$(grep -E '^ORRERY_LITELLM_BASE_URL=' .env | cut -d= -f2- || true)"
  LLM_URL="${LLM_URL:-http://host.docker.internal:4001}"
  echo "--- lab-api → LiteLLM reachability (${LLM_URL}/health/liveliness):"
  "${COMPOSE[@]}" exec -T lab-api node -e \
    "fetch('${LLM_URL}/health/liveliness').then(function(r){console.log('  HTTP',r.status)}).catch(function(e){console.log('  FAIL',e.message)})" \
    || echo "  (probe could not run)"
fi
echo "deploy_stack: $STACK stack up"
