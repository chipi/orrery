#!/usr/bin/env bash
# deploy_caddy_vhosts.sh — install orrery's Caddy vhosts + validate + restart-if-valid.
#
# Runs ON THE BOX as deploy@ from the /srv/orrery checkout (invoked by
# .github/workflows/deploy-prod.yml AFTER the "Deploy" step has `git reset --hard`ed the
# checkout — so ops/caddy/*.caddy is already present, same as ops/observability/orrery.alloy).
#
# Orrery owns its routing (its three vhosts). The shared Caddy edge ENGINE + the base
# Caddyfile (`import /etc/caddy/sites/*.caddy`) + the `systemctl restart caddy` sudoers grant
# are owned by podcast_scraper (ADR-114). deploy@ already owns /etc/caddy/sites/ and already
# has `sudo -n systemctl restart caddy` — this script needs NO new box grant.
#
#   Source (repo checkout, READ-ONLY):  <srcdir>/<name>.caddy   (default: ops/caddy)
#   Installed to:                        /etc/caddy/sites/<name>.caddy
#   env DRY_RUN=true → install + `caddy adapt` only; roll the files back, no restart.
#
# Safety: caddy runs with `admin off`, so it only picks up changes on RESTART — an invalid
# vhost on disk never affects the running engine, because we `caddy adapt` first and roll
# back before it could. We gate on `caddy adapt` (NOT `caddy validate`): caddy runs as user
# `caddy` and owns /var/log/caddy/*.log (0640); `validate` provisions the full config and
# opens those log writers, which fails as deploy@ ("permission denied"). `adapt` does the
# Caddyfile→JSON parse only — runs fine as deploy@ and still catches syntax errors, unknown
# directives, unresolved placeholders, and duplicate/ambiguous site addresses (the real
# breakage a vhost deploy can cause). The post-restart `is-active` check is the backstop.
set -euo pipefail

VHOSTS=(orrery orrery-telemetry orrery-analytics)
SRC="${1:-ops/caddy}"          # repo checkout dir, read-only — NEVER deleted
SITES=/etc/caddy/sites
BK="$(mktemp -d)"
cleanup() { rm -rf "$BK"; }    # only the backup tmp; never touch $SRC or $SITES
trap cleanup EXIT

changed=0
for v in "${VHOSTS[@]}"; do
  new="$SRC/${v}.caddy"
  cur="$SITES/${v}.caddy"
  [ -f "$new" ] || { echo "::error::source vhost missing: $new (is the checkout up to date?)"; exit 1; }
  if [ -f "$cur" ] && cmp -s "$new" "$cur"; then
    echo "  ${v}.caddy unchanged"
    continue
  fi
  [ -f "$cur" ] && cp -a "$cur" "$BK/${v}.caddy"
  cp "$new" "$cur"
  chmod 0644 "$cur"
  changed=1
  echo "  ${v}.caddy installed"
done

_restore() {
  for v in "${VHOSTS[@]}"; do
    [ -f "$BK/${v}.caddy" ] && cp "$BK/${v}.caddy" "$SITES/${v}.caddy"
  done
  # Always succeed: with nothing to restore (dry-run / no vhost changed) the loop's final
  # `[ -f ] && cp` is false, and under `set -e` that would abort before the caller's exit.
  return 0
}

# Adapt the WHOLE merged config (base Caddyfile imports sites/*). Source the systemd env the
# base Caddyfile interpolates ({$CADDY_BIND_ADDRS} / {$GLITCHTIP_UPSTREAM}) so it resolves.
BIND="$(sed -n 's/^Environment=CADDY_BIND_ADDRS=//p' /etc/systemd/system/caddy.service.d/10-public-bind.conf 2>/dev/null || true)"
GT="$(sed -n 's/^Environment=GLITCHTIP_UPSTREAM=//p' /etc/systemd/system/caddy.service.d/20-glitchtip-upstream.conf 2>/dev/null || true)"
_adapt() {
  CADDY_BIND_ADDRS="$BIND" GLITCHTIP_UPSTREAM="$GT" \
    caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1
}

if _adapt; then
  echo "  caddy config valid"
else
  echo "::error::caddy config INVALID after install — rolling back vhosts, NOT restarting"
  _restore
  # Re-run to surface WHY (the adapt error goes to stderr; drop the JSON on stdout).
  CADDY_BIND_ADDRS="$BIND" GLITCHTIP_UPSTREAM="$GT" \
    caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 >/dev/null | head -20 >&2 || true
  exit 1
fi

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "  DRY-RUN: valid; rolling back installed files, not restarting"
  _restore
  exit 0
fi

if [ "$changed" = 0 ]; then
  echo "  no vhost changed — caddy not restarted"
  exit 0
fi

if sudo -n /usr/bin/systemctl restart caddy && systemctl is-active --quiet caddy; then
  echo "  caddy restarted"
else
  echo "::error::caddy failed to restart — rolling back + restarting to last-good"
  _restore
  sudo -n /usr/bin/systemctl restart caddy || true
  exit 1
fi
