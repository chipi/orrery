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

## Grafana Cloud Agent (docker-stack logs)

> **Caveat — verify before relying on this section.** This covers server-side
> **log shipping** (ADR-068), a separate concern from the browser telemetry
> ladder above. It predates the estate's move to self-hosting and may be
> superseded (logs were reported moving to **VictoriaLogs** — see ADR-081
> context). It has not been re-verified in this pass; confirm against the current
> infra before using the Grafana Cloud steps below.

### What it ships

- **`orrery-web` container stdout/stderr.** nginx access logs + error log.
- **`orrery-pipeline-runner-*` container stdout/stderr.** Pipeline invocation output (every `docker compose run --rm pipeline-runner …` creates a uniquely-named container; the agent's `docker_sd_configs` regex picks them up automatically).

NOT shipped: other docker containers running on the host (the `keep` action on `__meta_docker_container_name` matching `/(orrery-web|orrery-pipeline-runner-.*)` filters them out — important on a laptop running multiple compose projects).

### One-time setup (Grafana Cloud stack)

1. Sign in to the operator's Grafana Cloud org (same one as podcast_scraper).
2. From the operator's stack home page, click **Connect data → Loki**.
3. Note the **Loki ingest URL** (the `host` field — e.g. `https://logs-prod-<NN>.grafana.net`). The full push URL is `<host>/loki/api/v1/push`. Note the numeric **instance ID** displayed alongside.
4. Click **Access Policies → Create access policy**. Name `orrery-logs-write`. Scope: **logs:write** only. Click **Add token**, name `orrery-agent`. Copy the `glc_…` token immediately (Grafana shows it once).
5. Set these in `.env` for local testing or in your production environment file:

   ```ini
   GRAFANA_CLOUD_LOKI_URL=https://logs-prod-<NN>.grafana.net/loki/api/v1/push
   GRAFANA_CLOUD_LOKI_USER=<numeric-instance-id-from-step-3>
   GRAFANA_CLOUD_API_KEY=glc_<token-from-step-4>
   GRAFANA_AGENT_ENV=local-dev    # or 'staging' / 'production-vps'
   ```

### Bringing up the stack with observability

```bash
# Web only (no agent — default for normal local-dev)
docker compose up -d web

# Web + agent (silent until env vars populated)
docker compose --profile observability up -d
```

When `GRAFANA_CLOUD_*` env vars are empty (the local-dev default), `ops/observability/agent-entrypoint.sh` picks the no-clients `grafana-agent.silent.yaml` config — the agent starts, opens its HTTP server on `:12345`, and does nothing else. Zero outbound TCP traffic.

When the env vars are all populated, the entrypoint picks `grafana-agent.yaml` — full Promtail mode shipping to Grafana Cloud Loki.

### Verifying the silent default

```bash
docker compose --profile observability up -d grafana-agent
sleep 5
docker logs orrery-grafana-agent
# → exactly one line:
#   [agent-entrypoint] Grafana Cloud creds NOT present → starting in silent mode (no shipping)

# Host-side outbound check from the agent container's PID:
lsof -p $(docker inspect -f '{‌{.State.Pid}}' orrery-grafana-agent) | grep TCP
# → no ESTABLISHED outbound connections, only the local listener on :12345
```

### Verifying the shipping default

With creds populated in `.env`:

```bash
docker compose --profile observability up -d grafana-agent
docker logs orrery-grafana-agent
# → [agent-entrypoint] Grafana Cloud creds present → starting with shipping config
# → (then Grafana Agent's normal Promtail/Loki client startup log)

# Generate some web traffic
curl -s http://localhost:8080/ >/dev/null

# Wait ~30 seconds, then check Grafana Cloud Loki:
# In the Grafana UI under Explore → Loki:
#   {app="orrery", env="local-dev", container="orrery-web"}
# → log lines from the curl above should appear.
```

### Importing the dashboards

Two dashboards live in `ops/observability/dashboards/`:

- `orrery-web-access.json` — web container log volume + stderr-incidence + recent lines.
- `orrery-pipelines.json` — pipeline invocations + error-line detection + recent logs.

Import them once per environment via the operator's Grafana Cloud Grafana instance:

```bash
GRAFANA_HTTP_URL=https://<your-stack>.grafana.net \
GRAFANA_API_TOKEN=glsa_<service-account-token-with-editor-role> \
  ./ops/observability/dashboards/import.sh
```

The script POSTs each dashboard JSON to `/api/dashboards/db` with `overwrite: true`. Re-running it updates the dashboards in-place (matched by `uid`). The Grafana API token is **not** the same as the Loki write token — it's a service account token with `Editor` role, created under **Administration → Service accounts → Add token**.

### Don't ship sensitive content through logs

The Loki ship pipeline mirrors whatever the web + pipeline-runner containers print to stdout/stderr. Don't print:

- API keys, DSNs, OAuth tokens.
- User-typed search strings (Orrery doesn't accept any today, but be aware if you add a feature that does).
- Full request URLs from pipeline scripts when those URLs may contain query-string secrets (e.g. signed S3 URLs).

For most existing scripts this is fine — they print mission IDs, agency names, status codes. Use structured logging (`JSON.stringify({ at: 'fetch-launches', stage: 'merge', count })`) when you want better Loki querying; unstructured stdout still works.

---

## Architecture summary

```
┌────────────────── browser (chipi.github.io) ───────────────────┐
│  SvelteKit app                                                 │
│    → hooks.client.ts                                           │
│      → initSentry()                                            │
│        if PUBLIC_SENTRY_DSN empty → return (no-op)             │
│        else → Sentry.init() with beforeSend scrubber           │
│                ↓                                               │
│                Sentry Cloud (operator's org / orrery-web)      │
└────────────────────────────────────────────────────────────────┘

┌─────────────── docker-compose stack (local + future VPS) ──────┐
│  web (nginx)                pipeline-runner (on-demand)        │
│    stdout/stderr               stdout/stderr                   │
│         ↓                          ↓                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  grafana-agent (profile-gated)                          │   │
│  │    agent-entrypoint.sh picks:                           │   │
│  │      - grafana-agent.silent.yaml (no creds → silent)    │   │
│  │      - grafana-agent.yaml (creds present → shipping)    │   │
│  │                                                         │   │
│  │  Shipping mode → Grafana Cloud Loki (operator's stack)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

Sentry observes the browser; Grafana Agent observes the docker stack. Both are silent by default. Neither has hardcoded credentials in the repo. The `scripts/check-no-secrets.ts` preflight gate scans every commit for DSN + API-key patterns.

---

## Reference

- **RFC-025** · [`docs/rfc/RFC-025.md`](../rfc/RFC-025.md) — full architecture rationale + scope + risks.
- **ADR-067** · [`docs/adr/ADR-067.md`](../adr/ADR-067.md) — Sentry config decisions.
- **ADR-068** · [`docs/adr/ADR-068.md`](../adr/ADR-068.md) — Grafana Agent compose pattern.
- **README §Privacy** — user-facing summary of what Sentry collects + doesn't.
- **`src/lib/observability/sentry.ts`** — the scrubber.
- **`ops/observability/`** — agent config + dashboards + entrypoint.
- **podcast_scraper RFC-081 §Layer-2** — the original integration pattern this RFC adapts.

---

*Orrery · docs/guides/observability.md · 2026-05-22 — Slice 3 of RFC-025 implementation*
