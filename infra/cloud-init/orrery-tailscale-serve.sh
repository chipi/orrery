#!/bin/sh
# Expose orrery's web container (host ORRERY_PORT, default 8090) via
# `tailscale serve` HTTPS on port 8443. Tailnet members reach orrery
# at `https://<host>.<tailnet>:8443/`.
#
# GH #260 phase 1. Mirrors podcast_scraper's
# infra/cloud-init/podcast-tailscale-serve.sh, with two deltas:
#   - HTTPS port is 8443 (not the tailnet node's default :443 — that's
#     held by podcast_scraper's viewer). Per #260 recommendation (a):
#     two apps on the same node distinguished by tailnet HTTPS port.
#   - Host port is ORRERY_PORT (default 8090), read from
#     /srv/orrery/.env if present.
#
# Must be POSIX `/bin/sh` (dash on Ubuntu): cloud-init `write_files`,
# systemd `ExecStartPost`, and `sudo sh` paths must not hit bash-only
# syntax; first-boot Terraform/cloud-init edge cases have produced
# `(` parse errors on broken copies.
set -eu

# Default host port matches docker-compose.prod.yml's `${ORRERY_PORT:-8090}`.
PORT=8090
if [ -f /srv/orrery/.env ]; then
  line=$(grep -E '^ORRERY_PORT=' /srv/orrery/.env | tail -1 || true)
  if [ -n "$line" ]; then
    v=$(echo "$line" | cut -d= -f2- | tr -d ' \t"' | tr -d "'")
    if [ -n "$v" ]; then PORT="$v"; fi
  fi
fi

# Wait up to 2 minutes for the orrery web container to start responding
# on the host port. Same wait pattern as podcast-tailscale-serve.sh, but
# probes GET / (orrery is a static SPA — no /api/health endpoint).
i=1
while [ "$i" -le 60 ]; do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  i=$((i + 1))
done

# Reset any prior serve config before re-registering. `|| true` so the
# script doesn't fail if no serve was previously configured. The :8443
# flag publishes HTTPS on that tailnet node port (not :443, which is
# podcast_scraper's).
/usr/bin/tailscale serve reset || true
exec /usr/bin/tailscale serve --bg --https=8443 "$PORT"
