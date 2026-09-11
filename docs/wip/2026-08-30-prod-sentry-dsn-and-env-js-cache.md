# Prod error tracking fix + `/_app/env.js` edge-cache — handover (2026-08-30)

Status at handover: **error tracking is LIVE again; the cache-hardening is half-done**
(origin correct, Cloudflare override still in place). One dashboard action remains.

## TL;DR of what happened
Prod Sentry/GlitchTip error tracking had been **silently dead**: the baked DSN pointed at
GlitchTip **project 4, which never existed** — every ingest returned `403 {"detail":"Denied"}`.
A dead error-report path produces no error report, so nothing surfaced.

Root of *why it stayed dead after the DSN was fixed*: `/_app/env.js` (the adapter-static
`$env/dynamic/public` runtime file — regenerated every deploy, NOT content-hashed) is
edge-cached, so a rotated DSN takes up to 4h to reach clients.

## What was DONE (verified)
1. **Created the real prod project** in GlitchTip: **project 18 `orrery-prod`**, public key
   `bbab2d17-4539-44c3-a693-bf9268736200`. Ingests `200` (verified direct + via public edge).
   - GlitchTip runs on **homelab** (Mac mini) in Docker: `glitchtip-web-1` / `glitchtip-postgres-1`
     (org `homelab`, id 1). Reach it: `ssh homelab-claude` (user `claude`, key `~/.ssh/homelab_mini`).
   - Read project DSNs from the DB:
     ```
     ssh homelab-claude '/usr/local/bin/docker exec glitchtip-postgres-1 \
       psql -U glitchtip -d glitchtip -tAF"|" -c \
       "SELECT p.id,p.slug,k.public_key FROM projects_project p \
        LEFT JOIN projects_projectkey k ON k.project_id=p.id ORDER BY p.id;"'
     ```
   - Create a project via the Django shell in `glitchtip-web-1`
     (`apps.projects.models.Project` / `ProjectKey`, `apps.organizations_ext.models.Organization`).
2. **Repointed the DSN** to `https://bbab2d17453944c3a693bf9268736200@telemetry.orrerylearn.com/18`:
   - GitHub `prod` env secret `PUBLIC_SENTRY_DSN` (used by `deploy-prod.yml`, baked into `env.js`).
   - `src/lib/target-env.ts` prod `sentryDsn` (mobile/internal builds read the DSN from here,
     NOT `env.js` — see `sentry.ts:58-61`).
   - Tests + stale `prod = 4` comments → 18.
3. **nginx `no-cache`** for `/_app/env.js` + `/_app/version.json` (`ops/docker/nginx.conf`).
4. Shipped: commit on `main` (`089b1bfb67`), preflight green (5002 tests), deploy + validate green.
   Cloudflare now serves `env.js` with the **project-18** DSN → new/cold clients report to the live project.

## What is NOT fixed (the one remaining action)
**Cloudflare overrides the origin `Cache-Control` for `.js` files.** Proof: `/sw.js` has had
`no-cache` in nginx for months, yet CF returns it `cache-control: max-age=14400` **even on a CF
MISS** (fresh from origin). So the nginx `no-cache` on `env.js` is correct but **ineffective** —
CF rewrites it. The 4h stale-config-on-deploy window remains.

### Do this tomorrow (Cloudflare dashboard — `orrerylearn.com` zone)
1. **Caching → Cache Rules → Create rule**
   - When: `URI Path` `equals` `/_app/env.js` (add `/_app/version.json` too — as a 2nd rule or an OR)
   - Then: **Bypass cache** + **Browser Cache TTL → Respect origin**
2. Also check **Caching → Configuration → Browser Cache TTL**: if it's `4 hours` (not "Respect
   Existing Headers"), THAT is what rewrites every `.js` to `max-age=14400`. Flipping it to
   *Respect Existing Headers* fixes it globally (bigger blast radius; the bypass rule is surgical).
3. Verify:
   ```
   curl -sI 'https://www.orrerylearn.com/_app/env.js' | grep -i 'cache-control\|cf-cache-status'
   # want: cache-control: no-cache   +   cf-cache-status: BYPASS (or DYNAMIC)
   ```
   `scripts/validate-prod.mjs` also guards this: it WARNs "env.js is not no-cache" until the CF
   rule lands, then flips to a steady PASS.

No CF API token is in the repo/GH secrets and there's no VPS SSH entry — that's why this is a
manual dashboard step. If a scoped CF API token is provided, the bypass rule can be scripted
(`POST /zones/{zone}/rulesets ... "action":"set_cache_settings","cache":false`).

## Lessons
- **An absent `Cache-Control` is "the CDN's default", not "no caching."** And a *present* origin
  header can still be **overridden** by a CDN Browser-Cache-TTL / Cache Rule — verify at the edge,
  not just the origin.
- **Dead telemetry is silent.** Only an active probe catches it: `validate-prod.mjs` SUITE 7d has
  an opt-in canary (`VALIDATE_ERROR_POST=1`) that POSTs a real error and expects `200` — the only
  guard that would have caught the never-existed-project-4.
- Probe the cache key browsers actually use: same host, **no** cache-buster query, `Accept-Encoding: zstd`.
