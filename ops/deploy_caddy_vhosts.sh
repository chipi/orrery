#!/usr/bin/env bash
# deploy_caddy_vhosts.sh — install orrery's Caddy vhosts + validate + reload-if-valid.
#
# Runs ON THE BOX as deploy@ from the /srv/orrery checkout (invoked by
# .github/workflows/deploy-prod.yml AFTER the "Deploy" step has `git reset --hard`ed the
# checkout — so ops/caddy/*.caddy is already present, same as ops/observability/orrery.alloy).
#
# Orrery owns its routing (its three vhosts). The shared Caddy edge ENGINE + the base
# Caddyfile (`import /etc/caddy/sites/*.caddy`) + the `systemctl reload|restart caddy`
# sudoers grant are owned by podcast_scraper (ADR-114). deploy@ already owns
# /etc/caddy/sites/ and already has the grant — this script needs NO new box grant.
#
#   Source (repo checkout, READ-ONLY):  <srcdir>/<name>.caddy   (default: ops/caddy)
#   Installed to:                        /etc/caddy/sites/<name>.caddy
#   env DRY_RUN=true → install + `caddy adapt` only; roll the files back, no reload.
#
# Reload, not restart: since 2026-10-15 the shared base Caddyfile's admin endpoint is a 0600
# unix socket (podcast_scraper 60dea6847; never on the network, T-02), so
# `systemctl reload caddy` swaps the config with no dropped request. A restart took the WHOLE
# edge down for seconds — every tenant on the box, not just orrery. Restart is only the
# fallback when a reload is refused (a box whose running config still has `admin off`).
#
# Safety: caddy picks up vhost files only when it loads its config (reload or restart), so an
# invalid vhost on disk never affects the running engine, because we `caddy adapt` first and
# roll back before it could; a refused reload also keeps the running config. We gate on
# `caddy adapt` (NOT `caddy validate`): caddy runs as user
# `caddy` and owns /var/log/caddy/*.log (0640); `validate` provisions the full config and
# opens those log writers, which fails as deploy@ ("permission denied"). `adapt` does the
# Caddyfile→JSON parse only — runs fine as deploy@ and still catches syntax errors, unknown
# directives, unresolved placeholders, and duplicate/ambiguous site addresses (the real
# breakage a vhost deploy can cause). The post-load `is-active` check is the backstop.
set -euo pipefail

VHOSTS=(orrery orrery-telemetry orrery-analytics)
# The lab-api + mcp backend vhosts (S4/D · #464) are added ONLY once their DNS
# resolves — a vhost for a name that doesn't resolve makes Caddy start ACME
# against a dead host on restart and burn Let's Encrypt's per-host failure budget
# (Fable-5 M1). getent = "resolves at all" (the names are Cloudflare-fronted, so
# they won't resolve to the box IP directly); a NXDOMAIN name is skipped with a
# warning and the next deploy (post-DNS) picks it up — an ordering mistake becomes
# a no-op, never churn.
for v in orrery-lab-api orrery-mcp; do
  host="${v#orrery-}.orrerylearn.com"   # orrery-lab-api → lab-api.orrerylearn.com
  if getent hosts "$host" >/dev/null 2>&1; then
    VHOSTS+=("$v")
    echo "  DNS ok for $host — will install ${v}.caddy"
  else
    echo "::warning::$host does not resolve yet — skipping ${v}.caddy (no ACME churn); re-run deploy once DNS is live"
  fi
done
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
  echo "::error::caddy config INVALID after install — rolling back vhosts, NOT reloading"
  _restore
  # Re-run to surface WHY (the adapt error goes to stderr; drop the JSON on stdout).
  CADDY_BIND_ADDRS="$BIND" GLITCHTIP_UPSTREAM="$GT" \
    caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 >/dev/null | head -20 >&2 || true
  exit 1
fi

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "  DRY-RUN: valid; rolling back installed files, not reloading"
  _restore
  exit 0
fi

if [ "$changed" = 0 ]; then
  echo "  no vhost changed — caddy not reloaded"
  exit 0
fi

if sudo -n /usr/bin/systemctl reload caddy && systemctl is-active --quiet caddy; then
  echo "  caddy reloaded"
elif sudo -n /usr/bin/systemctl restart caddy && systemctl is-active --quiet caddy; then
  echo "  caddy restarted (reload refused — is the base Caddyfile's admin socket live?)"
else
  echo "::error::caddy failed to load the vhosts — rolling back + restarting to last-good"
  _restore
  sudo -n /usr/bin/systemctl restart caddy || true
  exit 1
fi
