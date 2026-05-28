# Observability — Sentry (client errors) + Grafana Cloud (docker logs)

Operator guide for the observability stack defined in **[RFC-025](../rfc/RFC-025.md)** with **[ADR-067](../adr/ADR-067.md)** (Sentry) and **[ADR-068](../adr/ADR-068.md)** (Grafana Agent). Reuses the operator's existing Sentry org + Grafana Cloud stack from `podcast_scraper` RFC-081.

The integration shape is **load-bearing by env var, silent by default.** Empty environment variables mean both integrations short-circuit — Sentry's SDK returns before init, the Grafana Agent's entrypoint picks a no-clients config. Fork-friendly. No committed secrets anywhere in the repo.

---

## Sentry (client-side JS errors)

### What it captures

- **Unhandled exceptions** during route navigation, load functions, and Svelte component lifecycle (wired via `handleErrorWithSentry()` in `src/hooks.client.ts`).
- **Unhandled promise rejections** (Sentry's default `globalHandlers` integration catches `window.onerror` + `unhandledrejection`).
- **NOTHING else.** No performance tracing (`tracesSampleRate: 0`). No Web Vitals. No session replay. No user identifiers. The `beforeSend` hook strips URL query + hash, nulls headers + cookies, and sets `ip_address: '0.0.0.0'` (Sentry's discard sentinel). The `beforeBreadcrumb` hook drops `ui.input` breadcrumbs entirely.

See **[`src/lib/observability/sentry.ts`](../../src/lib/observability/sentry.ts)** for the full scrubber implementation.

### One-time setup (Sentry org)

1. Sign in to the operator's Sentry org (same one as podcast_scraper).
2. Create a new project: **Projects → New** → platform **JavaScript / SvelteKit** → name **`orrery-web`**.
3. From the project's **Settings → Client Keys (DSN)**, copy the DSN string. It looks like `https://<32-char-public-key>@<numeric-org-id>.ingest.us.sentry.io/<numeric-project-id>`. This is the value of `PUBLIC_SENTRY_DSN`.
4. (Recommended) Set **Data Scrubbing** under **Project → Settings → Security & Privacy** to "Scrub IP Addresses" and add `password`, `token`, `secret`, `api_key`, `apikey` to the sensitive-fields list. Belt-and-suspenders alongside the SDK's `beforeSend` hook.

### One-time setup (GH Actions secret)

```
Repo → Settings → Secrets and variables → Actions → New repository secret
  Name:  SENTRY_DSN_WEB
  Value: <the DSN from step 3>
```

That's the only secret the production build needs. `.github/workflows/preview.yml` threads it into the build's `env:` block as `PUBLIC_SENTRY_DSN`; SvelteKit inlines it into the static bundle at build time. Forks that don't have this secret in their own repo will build with an empty value and the SDK no-ops.

### Local-dev posture

- `npm run dev` and `npm run preview` both default to empty DSN → SDK does not initialise → no network requests. Verified in browser devtools network tab (search "ingest.sentry.io" → no hits).
- If you want to test against a real Sentry project from your laptop: create a separate **`orrery-dev`** project in Sentry, copy its DSN into your local `.env` as `PUBLIC_SENTRY_DSN=…`, and **don't commit it**. The `.env` is gitignored; the `scripts/check-no-secrets.ts` preflight gate scans the staged diff and fails the commit if a DSN slips through.

### Verifying it works

Once `SENTRY_DSN_WEB` is set in GH Actions secrets and a deploy has run:

1. Visit a production route on `chipi.github.io`, open browser devtools, and force-throw an error from the console:

   ```js
   setTimeout(() => { throw new Error('Sentry smoke test from chipi.github.io'); }, 0);
   ```

2. Within ~30 seconds, the error lands in Sentry's **Issues** list under the `orrery-web` project, with `request.url` showing the route path only (no query), `request.headers` undefined, `user.ip_address` shown as `0.0.0.0`.

3. If it doesn't appear: check the **Stats** view for rate-limited or filtered events; confirm `PUBLIC_SENTRY_DSN` is set in the deploy workflow's env (visible in the deploy workflow's logs as a redacted secret reference).

### Don't do this — PII leak vectors

`sendDefaultPii: false` + the `beforeSend` scrubber covers the SDK's default surfaces, but it cannot catch user data passed explicitly to Sentry calls. Avoid:

- `Sentry.captureMessage('user typed: ' + input)` — the message string isn't scrubbed.
- `Sentry.setUser({ email: '...' })` — Sentry attaches the entire object to subsequent events.
- `Sentry.addBreadcrumb({ message: input })` — the message bypasses `beforeBreadcrumb`'s category filter.
- Reading `localStorage`/`sessionStorage` into Sentry context (Orrery doesn't use either, per ADR-016; just don't add it).

If you need to capture context for debugging, redact at the call site: `Sentry.setContext('mission', { id: missionId })` is fine (mission IDs are non-PII identifiers and live in the URL anyway).

---

## Grafana Cloud Agent (docker-stack logs)

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
