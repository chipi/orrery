# v0.9 backend deploy plan — lab-api + MCP to prod (one-hit "deploy production")

Date: 2026-09-07 · Owner: me · Flow: **plan → Fable-5 pre-review → execution** (arc cadence).

## Goal

`Deploy to prod VPS` (workflow_dispatch) brings up the **whole stack in one hit** — web
(frontend) **+ mcp + lab-api** (backend) — with the new containers **hooked into the existing
observability rig** (logs → homelab VictoriaLogs, tagged prod, via the shared node Alloy). No new
infra: lean on Tailscale-SSH deploy, GHCR images, shared Caddy edge, shared Alloy — all already
here.

## Current state (what D/E already scaffolded — verified today)

- **Images**: CI `mcp-image` + `lab-api-image` jobs build + publish `ghcr.io/chipi/orrery-mcp` and
  `orrery-lab-api` (`:main` + `:sha-<7>`) on every green main push. Confirmed green for `5d7585b9cf`.
- **Compose**: `mcp` (loopback 8091) + `lab-api` (loopback 8093) fully defined with the env
  contract + DEPLOY NOTES (compose/docker-compose.prod.yml).
- **Caddy**: `ops/caddy/orrery-mcp.caddy` + `orrery-lab-api.caddy` (TLS + reverse_proxy to
  loopback) already exist; `ops/deploy_caddy_vhosts.sh` installs them, `caddy adapt`-gates, restarts
  — **already invoked** by deploy-prod.yml. So routing lands automatically once DNS resolves.
- **Observability**: deploy-prod.yml **already** copies `ops/observability/orrery.alloy` into the
  shared node's `config.d/` + `docker kill -s HUP alloy`. Logs → homelab VictoriaLogs (`app:orrery`
  in Grafana `http://homelab:3000`), infra ADR-121.
- **LiteLLM**: prod gateway live; virtual key `proj-orrery-lab` minted ($5/7d); nginx CSP already
  allows lab-api (7a6343dfcf); iss-pass TLE overlay refresh wired (H4c).
- **Google callback path** (from `server/lab-api/google.ts`): `${issuer}/auth/google/callback` =
  `https://lab-api.orrerylearn.com/auth/google/callback`.

## The delta (my changes — this repo, pushed to main)

**D1 · deploy-prod.yml — deploy the whole stack, not just web.**
- Warm-pull + `up -d web mcp lab-api` (currently only `web`). Pass `ORRERY_MCP_IMAGE_TAG` +
  `ORRERY_LAB_API_IMAGE_TAG` = the deployed SHA (roll-forward/back parity with pipeline-runner).
- Idempotent first-boot setup for lab-api (compose DEPLOY NOTES): `mkdir -p lab-api-state`, chown to
  the container's `labapi` uid (or `chmod 770`), and seed `lab-api-state/allowlist.json`
  (`{"emails":[...]}`) from a GH var if absent — missing file = deny-all (fail-closed).
- Healthcheck mcp (`/health` via loopback) + lab-api (`/jwks` returns a key) after `up -d`, with a
  logs dump on failure (mirror the existing web healthcheck).

**D2 · deploy-prod.yml `.env` staging — add the backend secrets.** Append to the staged `/srv/orrery/.env`
(from `prod`-scoped GH secrets; empty → compose `${VAR:-}` default → integration silently off, stack
still starts):
`ORRERY_MCP_IMAGE_TAG` · `ORRERY_LAB_API_IMAGE_TAG` · `ORRERY_LAB_GOOGLE_CLIENT_ID` ·
`ORRERY_LAB_GOOGLE_CLIENT_SECRET` · `ORRERY_LAB_CLAUDE_CLIENT_SECRET` · `ORRERY_LITELLM_API_KEY` ·
`ORRERY_LAB_WEB_REDIRECT_URIS` · `ORRERY_LAB_CORS_ORIGINS`.

**D3 · ops/observability/orrery.alloy — ship the new containers' logs.** Extend the
`discovery.relabel "orrery"` keep-filter from `/(orrery-web|orrery-pipeline-runner-.*)` to also
match `orrery-mcp` + `orrery-lab-api`, with `surface` labels (`mcp`, `lab-api`). Same sink, same
`app=orrery`, prod-tagged by the shared node's env label. Auto-deploys via D1's existing Alloy copy+HUP.

**D4 · docs** — update `docs/ops/deploy-prod-vps.md` (new services in the up-list + the one-time
allowlist/OAuth notes) and TA.md's deploy row.

## What I need from you (blocking execution)

1. **Google OAuth client** (Google Cloud Console — I can't create it):
   - Create an **OAuth 2.0 Client ID · Web application**.
   - **Authorized redirect URI**: `https://lab-api.orrerylearn.com/auth/google/callback`
   - Give me the **Client ID** + **Client Secret**.
2. **DNS** — two A records on `orrerylearn.com` → the VPS public IP (same box as
   `orrery.orrerylearn.com`): `lab-api` and `mcp`. **Must resolve BEFORE the Caddy vhosts land** or
   ACME burns Let's Encrypt rate limits. Tell me where DNS is managed — if I can get an API
   token/access I'll do it; otherwise you add the two records.
3. **Confirm the allowlist email** — your gmail (the file starts with only you). The email on file
   is `marko.dragoljevic@gmail.com` — confirm that's the one, or give the right address.
4. **LiteLLM virtual key** — confirm I can reuse/retrieve the minted `proj-orrery-lab` key value, or
   I'll re-mint one on the prod gateway (`/key/generate`, alias orrery-lab-api, $5/7d).

Things I can do myself once I have the above: `LAB_CLAUDE_CLIENT_SECRET` (I'll generate a strong
random secret for the claude-ai connector), set the GH prod-environment secrets via `gh secret set`,
`LAB_WEB_REDIRECT_URIS` + `LAB_CORS_ORIGINS` (= the app origins: prod `https://orrerylearn.com`,
staging Pages origin).

## Execution order

1. (me) Land D1–D4 on main (preflight-green; the deploy-workflow changes don't affect app CI).
2. (you) DNS A records; Google OAuth client; hand me the ID/secret + gmail confirm.
3. (me) `gh secret set` the prod-environment secrets; verify DNS resolves.
4. (me) Run `Deploy to prod VPS` (workflow_dispatch) → whole stack up.
5. (me) **Smoke test**: Caddy TLS on both subdomains; `GET /jwks` (lab-api); lab-api `/health`;
   Google OAuth round-trip; `/ask` → LiteLLM (budget-capped); MCP `tools/list` + one authed tool
   call; **observability**: confirm `app:orrery surface:lab-api|mcp` logs land in homelab
   VictoriaLogs tagged prod.
6. (you) Google sign-in acceptance + add the MCP as a Claude.ai custom connector and complete OAuth.

## Rollback (per risky-change discipline)

- Each service is independent: `docker compose stop mcp lab-api` reverts to web-only; the front end
  is untouched.
- Caddy vhosts: `rm /etc/caddy/sites/orrery-{mcp,lab-api}.caddy && sudo systemctl restart caddy`.
- Alloy: revert `orrery.alloy` + HUP. Image roll-back: re-dispatch with `override_image_sha`.
- lab-api fail-closed by design: no secrets → boots but integrations off (no data loss); allowlist
  missing → denies all (safe).

## Non-goals / explicitly NOT in this pass

- No release tag (operator, standing).
- No change to the front-end deploy behavior beyond adding the backend services to the same run.
- AR pass-hint i18n; Higgsfield illustration batch (separate, tracked).
