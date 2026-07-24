# Observability — GlitchTip (client errors) + Umami (usage) + docker logs

Operator guide for browser telemetry. **Source of truth: [ADR-082](../adr/ADR-082.md)** (the telemetry environment ladder), with **[ADR-067](../adr/ADR-067.md)** (Sentry SDK → GlitchTip) and **[ADR-081](../adr/ADR-081.md)** (Umami) as the per-integration decisions. RFC-025 is a historical snapshot — do not wire from its diagram.

> **The error sink is self-hosted [GlitchTip](https://glitchtip.com/), not Sentry SaaS.** We use the `@sentry/sveltekit` SDK, but it points at our self-hosted GlitchTip at `telemetry.orrerylearn.com`. Anywhere below that still says "Sentry org / ingest.sentry.io", read "GlitchTip project".

**The env ladder (ADR-082).** Both browser integrations report on three isolated rungs — **prod** (`orrerylearn.com`), **staging** (`chipi.github.io/orrery`), and the maintainer's **local `vite dev`** — each with its own GlitchTip project + Umami site, tagged by environment:

| Rung | GlitchTip project | Umami site | env tag | selected by |
|---|---|---|---|---|
| prod | 4 | prod | `production` | `deploy-prod.yml` (`prod` GH env) |
| staging | 6 | staging | `staging` | `staging.yml` (`staging` GH env) |
| dev | 7 | dev | `dev` | `sentry.ts` / `analytics.ts` fallback, over the Tailscale `homelab` host |

The integration shape is **env-gated, fork-silent by construction.** Deploy rungs bake `PUBLIC_*` from GH environment secrets a fork doesn't have; the dev rung's endpoints resolve only on our tailnet (`homelab`), so a stranger's `vite dev` transport-fails silently. `vite preview` / CI / screenshots are not `dev` and carry no baked vars → silent. No committed secrets — only the public DSN/site-id browser ids, which ship in the bundle by design.

> **In-browser sibling:** for live, per-route inspection (FPS, current locale, page-specific debug views), use the in-app DebugPanel — append `?debug=1` to any route. Sentry catches production errors after the fact; the DebugPanel is the during-development surface. See AGENTS.md §"Debugging — `?debug=1` is the in-app inspector" for tabs, registrar pattern, and when to expand stubs.

---

## Sentry (client-side JS errors)

### What it captures

- **Unhandled exceptions** during route navigation, load functions, and Svelte component lifecycle (wired via `handleErrorWithSentry()` in `src/hooks.client.ts`).
- **Unhandled promise rejections** (Sentry's default `globalHandlers` integration catches `window.onerror` + `unhandledrejection`).
- **NOTHING else.** No performance tracing (`tracesSampleRate: 0`). No Web Vitals. No session replay. No user identifiers. The `beforeSend` hook strips URL query + hash, nulls headers + cookies, and sets `ip_address: '0.0.0.0'` (Sentry's discard sentinel). The `beforeBreadcrumb` hook drops `ui.input` breadcrumbs entirely.

See **[`src/lib/observability/sentry.ts`](../../src/lib/observability/sentry.ts)** for the full scrubber implementation.

### One-time setup (GlitchTip projects — one per rung)

Done once on the self-hosted GlitchTip (over the tailnet). Already provisioned: **project 4** (prod), **project 6** (staging), **project 7** (dev). Each project's **Settings → Client Keys (DSN)** gives a public DSN of the form `http(s)://<32-hex-key>@<host>/<project-id>` — the project id at the end is what routes events to the right rung.

- **prod / staging** DSNs are set as the `PUBLIC_SENTRY_DSN` secret inside the **`prod`** and **`staging`** GH environments respectively (Repo → Settings → Environments → pick env → Secrets). Never at the repo level — the environment gate is the point.
- **dev** DSN is the `DEV_SENTRY_DSN` constant in `src/lib/observability/sentry.ts` (project 7, `homelab:8090`). It's committed on purpose: a DSN is a public browser id, and the `homelab` host is tailnet-only, so it's inert off the tailnet.

### CI wiring (already in the workflows)

- `deploy-prod.yml` (`environment: prod`) and `staging.yml` (`environment: staging`) each thread their environment's `PUBLIC_SENTRY_DSN` + `PUBLIC_UMAMI_*` into the build `env:` block, with `PUBLIC_SENTRY_ENVIRONMENT` = `production` / `staging`. SvelteKit inlines them at build time. A fork lacks both environments → empty → SDK no-ops.
- There is **no repo-level `SENTRY_DSN_WEB` secret** anymore (that was the old single-env design); the value lives per-GH-environment.

### Local-dev posture (the dev rung)

- `vite dev` **now reports** — with no `PUBLIC_SENTRY_*` override it falls back to the dev DSN (GlitchTip project 7) via `homelab:8090`. On the maintainer's tailnet this is live; off the tailnet the host doesn't resolve, the transport fails, and nothing leaves the browser (fork-silent by construction). Dev events carry a `worktree` tag (git branch) so parallel local sessions are separable.
- `vite preview`, the screenshot pipeline, and CI are **not** `dev` and carry no baked vars → silent. To point local dev at a *different* project, set `PUBLIC_SENTRY_DSN=…` in your gitignored `.env` (the `scripts/check-no-secrets.ts` gate still scans the staged diff).

### Verifying it works

Pick the rung. For **dev**: run `vite dev` on the tailnet, force-throw from the console, and confirm the event lands in GlitchTip **project 7** tagged `environment=dev` + your `worktree`. For a **deploy rung**: visit the route (`orrerylearn.com` for prod, `chipi.github.io/orrery` for staging) and do the same — it lands in project **4** / **6** tagged `production` / `staging`:

```js
setTimeout(() => { throw new Error('GlitchTip smoke test'); }, 0);
```

The event shows `request.url` as the route path only (no query), `request.headers` undefined, `user.ip_address` as `0.0.0.0`. If it doesn't appear: confirm the DSN's project id matches the rung, and that `PUBLIC_SENTRY_DSN` is set in that GH environment (redacted in the deploy logs).

### Umami (usage analytics) — same ladder

Umami mirrors the above (ADR-081): prod/staging bake `PUBLIC_UMAMI_HOST` + `PUBLIC_UMAMI_WEBSITE_ID` (their own site ids) from the matching GH environment; `vite dev` falls back to the dev site via `homelab:3001`. Only the website id changes per rung — the host is the shared `analytics.orrerylearn.com` edge for deploys, `homelab` for dev. Fork-silence + the "not `dev` → silent" rule are identical. Event registry + privacy scrubbing live in `src/lib/analytics.ts`.

### Don't do this — PII leak vectors

`sendDefaultPii: false` + the `beforeSend` scrubber covers the SDK's default surfaces, but it cannot catch user data passed explicitly to Sentry calls. Avoid:

- `Sentry.captureMessage('user typed: ' + input)` — the message string isn't scrubbed.
- `Sentry.setUser({ email: '...' })` — Sentry attaches the entire object to subsequent events.
- `Sentry.addBreadcrumb({ message: input })` — the message bypasses `beforeBreadcrumb`'s category filter.
- Reading `localStorage`/`sessionStorage` into Sentry context (Orrery doesn't use either, per ADR-016; just don't add it).

If you need to capture context for debugging, redact at the call site: `Sentry.setContext('mission', { id: missionId })` is fine (mission IDs are non-PII identifiers and live in the URL anyway).

---

## Container + refresh logs — shared node Alloy → VictoriaLogs

Server-side log shipping, self-hosted. **The per-app `orrery-grafana-agent` (grafana/agent v0.43) is retired** — it was EOL and its `docker_sd` keep-filter leaked, mislabelling podcast-infra logs as `app=orrery`. It's replaced by a **shared node [Grafana Alloy](https://grafana.com/docs/alloy/)** that runs once on the box for all apps; Orrery contributes a config fragment. Anything below referencing "Grafana Cloud", "grafana-agent", `GRAFANA_CLOUD_*`, or a `--profile observability` service is historical.

- **Shipper:** the shared node Alloy (owned by the infra repo, ADR-121 / podcast infra #1268), config in `/etc/alloy/config.d/`.
- **Sink:** self-hosted **VictoriaLogs** (via the shared `loki.write "logs_sink"` component in `base.alloy`), queried with **LogsQL**.
- **Dashboards / query UI:** self-hosted **Grafana** on the tailnet (`http://homelab:3000`) — a viewer over VictoriaLogs, *not* Grafana Cloud.

### Orrery's config fragment — `ops/observability/orrery.alloy`

This repo owns exactly one file: `ops/observability/orrery.alloy`, dropped into the box's `/etc/alloy/config.d/` on deploy and hot-reloaded with `docker kill -s HUP alloy` (never restart the shared Alloy). It references shared components from `base.alloy` (`discovery.docker "app"`, `loki.write "logs_sink"`) — **do not touch `base.alloy` or the podcast sources.**

### What it ships

- **`orrery-web`** (nginx) stdout/stderr → labelled `surface=web`.
- **`orrery-pipeline-runner-*`** (each on-demand `docker compose run --rm pipeline-runner …` container) → `surface=pipeline`.
- **The on-VPS launch-data refresh log** — `/srv/orrery/data-refresh.log` (RFC-035, the 6-hourly cron; Alloy sees the host root at `/rootfs`), labelled `job=orrery-data-refresh`. Its `[refresh-prod-data] … ok — … bytes` / `FETCH FAILED` lines drive the **`orrery-launch-data-stale`** alert.

Every Orrery stream carries `app=orrery` (set in `orrery.alloy`, since `logs_sink` no longer sets `app` globally). A `discovery.relabel` `keep` on `/(orrery-web|orrery-pipeline-runner-.*)` scopes it tightly — the too-broad keep was the old agent's leak. Other containers on the host are not shipped under `app=orrery`.

### Deploying the config (no per-app service, no cloud creds)

There is nothing to bring up in Orrery's compose stack for logs — the shipper is the node-level Alloy, and Orrery only provides a config fragment. Deploy is: copy `ops/observability/orrery.alloy` into the box's `/etc/alloy/config.d/`, then hot-reload:

```bash
# on the box (over the tailnet), after updating the fragment:
docker kill -s HUP alloy   # reload config.d/ — do NOT restart the shared Alloy
```

No `GRAFANA_CLOUD_*` env vars, no Loki write token, no `--profile observability` service. The VictoriaLogs sink + Docker-socket discovery live in `base.alloy` (infra repo). A checkout without tailnet access to the box simply doesn't ship — there's no Orrery-side credential to leak.

### Verifying logs land

```bash
# generate some web traffic against the running stack
curl -s http://localhost:8080/ >/dev/null
```

Then query VictoriaLogs from the self-hosted Grafana (`http://homelab:3000`, Explore → VictoriaLogs datasource, LogsQL):

```text
app:orrery surface:web           # nginx access/error lines from the curl above
app:orrery surface:pipeline      # pipeline-runner invocations
app:orrery job:orrery-data-refresh   # the 6-hourly launch-data refresh cron
```

If nothing appears: confirm `orrery.alloy` is in `/etc/alloy/config.d/` and was hot-reloaded (`docker kill -s HUP alloy`), and that you're on the tailnet.

### Importing the dashboards

Three dashboards live in `ops/observability/dashboards/` (all panels query VictoriaLogs via LogsQL):

- `orrery-overview.json` — cross-surface health at a glance.
- `orrery-web.json` — web container log volume + stderr incidence + recent lines.
- `orrery-pipelines.json` — pipeline invocations + error-line detection + recent logs.

Import them into the self-hosted Grafana (tailnet) — idempotent, matched by `uid`:

```bash
GRAFANA_HTTP_URL=http://homelab:3000 \
GRAFANA_API_TOKEN=glsa_<service-account-token-with-editor-role> \
  ./ops/observability/dashboards/import.sh
```

The script POSTs each dashboard to `/api/dashboards/db` with `overwrite: true` into the `orrery` folder (`GRAFANA_FOLDER_UID`, default `orrery`). The token is a Grafana **service-account token with `Editor` role** (Administration → Service accounts → Add token) — unrelated to any log-ingest credential.

### Don't ship sensitive content through logs

The pipeline mirrors whatever the web + pipeline-runner containers print to stdout/stderr. Don't print:

- API keys, DSNs, OAuth tokens.
- User-typed search strings (Orrery doesn't accept any today, but be aware if you add a feature that does).
- Full request URLs from pipeline scripts when those URLs may contain query-string secrets (e.g. signed S3 URLs).

For most existing scripts this is fine — they print mission IDs, agency names, status codes. Use structured logging (`JSON.stringify({ at: 'fetch-launches', stage: 'merge', count })`) when you want sharper VictoriaLogs (LogsQL) querying; unstructured stdout still works.

---

## Architecture summary

```
┌──────── browser (prod orrerylearn.com · staging chipi.github.io) ───────┐
│  SvelteKit app                                                          │
│    → hooks.client.ts → initSentry()   +   +layout → initAnalytics()     │
│        DSN/site id resolves for the rung? (ADR-082)                      │
│          prod  → GlitchTip 4  + Umami prod   (env=production)            │
│          staging → GlitchTip 6 + Umami staging (env=staging)             │
│          vite dev → GlitchTip 7 + Umami dev  (env=dev, via homelab)      │
│          else (fork / preview / CI) → no-op                             │
│                ↓ (self-hosted, Cloudflare-fronted)                      │
│      telemetry.orrerylearn.com (GlitchTip) · analytics.orrerylearn.com  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────── the box (VPS + local docker stack) ──────────────────────┐
│  orrery-web (nginx)        orrery-pipeline-runner-*   data-refresh.log   │
│    stdout/stderr             stdout/stderr             (RFC-035 cron)    │
│         ↓                        ↓                        ↓              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  shared node Grafana Alloy  (infra repo · ADR-121)                 │  │
│  │    /etc/alloy/config.d/orrery.alloy  (this repo's fragment)        │  │
│  │    labels: app=orrery, surface=web|pipeline, job=orrery-data-...   │  │
│  │                     ↓  loki.write "logs_sink" (base.alloy)         │  │
│  │              self-hosted VictoriaLogs → Grafana (homelab:3000)     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

GlitchTip + Umami observe the browser (three isolated rungs, ADR-082); the shared node Alloy ships the box's logs to VictoriaLogs. The whole estate is self-hosted — no third-party SaaS. Orrery holds no ingest credential in the repo: browser DSN/site-ids are public, deploy secrets live in GH environments, and the log path is tailnet-only. The `scripts/check-no-secrets.ts` preflight gate scans every commit for DSN + API-key patterns.

---

## Reference

- **ADR-082** · [`docs/adr/ADR-082.md`](../adr/ADR-082.md) — **the telemetry environment ladder (source of truth)**.
- **ADR-067** · [`docs/adr/ADR-067.md`](../adr/ADR-067.md) — Sentry SDK → GlitchTip config (+ ADR-082 amendment).
- **ADR-081** · [`docs/adr/ADR-081.md`](../adr/ADR-081.md) — self-hosted Umami (+ ADR-082 amendment).
- **ADR-068** · [`docs/adr/ADR-068.md`](../adr/ADR-068.md) — original Grafana-Cloud log-shipper pattern, **superseded** by the shared node Alloy → VictoriaLogs (ADR-121, infra repo).
- **RFC-025** · [`docs/rfc/RFC-025.md`](../rfc/RFC-025.md) — historical rationale (see its post-closure note).
- **README §Privacy** — user-facing summary of what the browser telemetry collects + doesn't.
- **`src/lib/observability/sentry.ts`** / **`src/lib/analytics.ts`** — the scrubbers + env-ladder resolution.
- **`ops/observability/orrery.alloy`** + **`ops/observability/dashboards/`** — the log fragment + Grafana dashboards.
- **podcast_scraper-infra ADR-121 / #1268** — the shared node Alloy + VictoriaLogs migration this repo plugs into.

---

*Orrery · docs/guides/observability.md · 2026-07-24 — realigned to self-hosted GlitchTip + Umami (ADR-082) and the shared node Alloy → VictoriaLogs log pipeline*
