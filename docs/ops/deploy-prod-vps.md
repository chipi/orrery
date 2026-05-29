# Deploy orrery to prod VPS — operator runbook

GH #260 phase 1 (tailnet-only) + #261 thin-deploy pivot. Standing orrery up on the existing always-on Hetzner VPS that also hosts podcast_scraper.

Phase 2 (public DNS + TLS) is **deferred** — see #260 §"Phase 2".

The deploy workflow follows the same ownership split as podcast_scraper: **cloud-init owns bootstrap** (runs as root, once, at VPS first-boot), **the workflow owns deploy** (runs as `deploy`, idempotent, every push).

---

## Architecture

```
                                     ┌──────────────────────────────────────┐
                                     │ Hetzner VPS (existing, podcast_scraper-host) │
                                     │                                      │
                                     │  /srv/podcast-scraper/  (existing)   │
                                     │     compose ↔ host :8080             │
                                     │     tailscale serve :443             │
                                     │                                      │
                                     │  /srv/orrery/        (new — #260)    │
                                     │     compose ↔ host :8090             │
                                     │     tailscale serve :8443            │
                                     │                                      │
                                     └──────────────────────────────────────┘
                                                      │
                                                      │ tailnet (no public DNS)
                                                      ▼
                              https://<host>.<tailnet>:443    ← podcast_scraper viewer
                              https://<host>.<tailnet>:8443   ← orrery (new)
```

Co-tenancy is enforced by four mechanics:

| Mechanic | podcast_scraper | orrery |
|---|---|---|
| Compose project name | `podcast_scraper` | `orrery` |
| Host port | `:8080` | `:8090` (env: `ORRERY_PORT`) |
| Filesystem root | `/srv/podcast-scraper/` | `/srv/orrery/` |
| Tailscale serve | `--https=443` | `--https=8443` |

---

## VPS prerequisites — owned by podcast_scraper cloud-init

orrery rides on the existing tailnet node where podcast_scraper runs. The following are owned by podcast_scraper's Terraform / cloud-init in its own repo. Some pre-existed (✅); two were added for orrery (➕, tracked under chipi/podcast_scraper#834 + #261-Move-1):

- ✅ VPS provisioned (Hetzner CAX) with tailnet identity registered
- ✅ `deploy@` user exists, in the `docker` group
- ✅ Docker engine + `docker compose` plugin installed
- ✅ Hetzner firewall: 22/SSH + ICMP only; all other ports private
- ➕ `deploy@` `~/.ssh/authorized_keys` includes the orrery deploy pubkey matching `PROD_SSH_PRIVATE_KEY` (in addition to the pre-existing podcast_scraper deploy key)
- ➕ `/srv/orrery/` exists as a `deploy:deploy`-owned git checkout of `chipi/orrery` `main`

The reason the last two ride in podcast_scraper's cloud-init: terraform owns the VPS state. An imperative `mkdir + cat >> authorized_keys` from this repo would be overwritten on the next `tofu apply`. Doing it via the cloud-init that already templates the host keeps it durable across VPS rebuilds.

orrery adds **zero ad-hoc steps** at deploy time. The workflow assumes the checkout exists and just `git fetch+reset --hard origin/main`s.

---

## The deploy flow

After the prereqs above land, every deploy is just:

1. SSHes into VPS as `deploy@`
2. Builds the static bundle on the runner with `PUBLIC_SENTRY_*` env exported (vite/SvelteKit bakes them in)
3. Rsyncs the CI-built `build/` into `/srv/orrery/build/` (the static-bundle deploy artefact — ADR-063)
4. **Stages `/srv/orrery/.env`** from GH `prod` env secrets (atomic: `mktemp -p /dev/shm` + trap shred + `printf` + scp `.env.deploy-staged` + atomic `mv`). Single source of truth — missing secrets → empty values → integrations no-op
5. `git fetch --depth=50 origin main` + `git reset --hard origin/main` — brings the on-VPS checkout in lockstep with the deploying commit
6. `source ./.env` then `docker compose --env-file .env --profile observability pull/up web grafana-agent` — pipeline-runner stays `profiles: manual` (invoked on-demand); grafana-agent ships logs to Loki when creds are present, otherwise runs silent
7. Loopback healthcheck on `:ORRERY_PORT`
8. Re-arms tailscale serve via the root-owned wrapper `sudo -n /usr/local/sbin/orrery-tailscale-serve.sh` (narrow NOPASSWD entry; podcast_scraper#838)
9. External tailnet probe at `https://<PROD_TAILNET_FQDN>:8443/`

**No sudo for the bulk of the work. No `.env` scaffolding by the operator. No `mkdir`.** All operations run as the `deploy@` user except the one narrow `sudo -n` call to the root-owned tailscale-serve wrapper.

**The staged `/srv/orrery/.env`** is RAM-rendered + shipped atomically + `chmod 600` — never persists on the runner's disk. It contains both static config (`COMPOSE_PROJECT_NAME`, `ORRERY_PORT`, `ORRERY_PIPELINE_IMAGE_TAG`) AND runtime Grafana credentials. Regenerated every deploy from GH Secrets — those are the source of truth.

---

## Caveat — tailscale-serve durability

`tailscale serve --bg` registers the `:8443` → `127.0.0.1:8090` mapping in tailscaled's runtime state. **This does not persist across `tailscaled` restarts** (VPS reboot, tailscale package upgrade). The deploy workflow re-registers on every run, so a successful deploy after a restart re-arms the serve config.

For true persistence (survive between deploys when there is no operator action), the systemd `ExecStartPost` pattern from podcast_scraper should be replicated in the **same Terraform / cloud-init that provisioned the VPS** (which lives in the podcast_scraper repo). The snippet below is ready to paste:

```yaml
# Add to podcast_scraper's infra/cloud-init/prod.user-data, alongside
# the existing podcast-tailscale-serve.sh write_files entry:
write_files:
  - path: /usr/local/sbin/orrery-tailscale-serve.sh
    permissions: '0755'
    content: |
      #!/bin/sh
      # Mirrors podcast-tailscale-serve.sh, publishing orrery's host
      # ORRERY_PORT (default 8090) on the tailnet at HTTPS :8443.
      # Source of truth: orrery repo infra/cloud-init/orrery-tailscale-serve.sh
      set -eu
      PORT=8090
      if [ -f /srv/orrery/.env ]; then
        line=$(grep -E '^ORRERY_PORT=' /srv/orrery/.env | tail -1 || true)
        if [ -n "$line" ]; then
          v=$(echo "$line" | cut -d= -f2- | tr -d ' \t"' | tr -d "'")
          if [ -n "$v" ]; then PORT="$v"; fi
        fi
      fi
      i=1
      while [ "$i" -le 60 ]; do
        if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
          break
        fi
        sleep 2
        i=$((i + 1))
      done
      /usr/bin/tailscale serve --bg --https=8443 "$PORT"
  - path: /etc/systemd/system/tailscaled.service.d/orrery-serve.conf
    permissions: '0644'
    content: |
      [Service]
      ExecStartPost=/usr/local/sbin/orrery-tailscale-serve.sh

# In the runcmd section of the same cloud-init, add:
runcmd:
  - systemctl daemon-reload
  - systemctl restart tailscaled.service
```

Once that's in podcast_scraper's Terraform + a `tofu apply` lands, the tailscale-serve registration persists across reboots automatically. **Until then, every orrery deploy re-arms it** — which is fine for the test-and-iterate phase.

---

## GitHub Actions setup (one-time)

In the orrery repo settings → **Environments → prod → Environment secrets/variables**:

### Required (deploy will skip with warning if missing)

| Type | Name | Value |
|---|---|---|
| Secret | `TS_AUTHKEY` | Tailscale auth key with `tag:gha-deployer`. Reusable, 90-day expiry recommended. |
| Secret | `PROD_SSH_PRIVATE_KEY` | Ed25519 PEM (private key matching `~/.ssh/authorized_keys` of `deploy@` on the VPS). |
| Variable | `PROD_TAILNET_FQDN` | The MagicDNS host of the VPS, e.g. `prod-podcast.<tailnet>.ts.net`. Same host that serves podcast_scraper; orrery uses a different tailscale-serve port (:8443). |

### Optional — observability (#263)

All four can be left unset; integrations silently no-op (`${VAR:-}` defaults in compose) and the stack still comes up. Set when you're ready to wire telemetry. Per ADR-067 / ADR-068.

| Type | Name | Value |
|---|---|---|
| Secret | `PUBLIC_SENTRY_DSN` | Sentry project DSN. Public-by-design (identifies the project, doesn't authenticate). Baked into the static bundle at build time. Note: name omits `PROD_` prefix because the workflow passes it through unchanged as a `PUBLIC_*` SvelteKit env. |
| Secret | `PROD_GRAFANA_CLOUD_LOKI_URL` | `https://logs-prod-<NN>.grafana.net/loki/api/v1/push` from your Grafana Cloud stack's Loki integration page. |
| Secret | `PROD_GRAFANA_CLOUD_LOKI_USER` | Numeric instance ID, same page. |
| Secret | `PROD_GRAFANA_CLOUD_API_KEY` | `glc_…` token from Grafana Cloud → Access policies. Same key as podcast_scraper if reusing the stack. |

The workflow's **Stage `/srv/orrery/.env`** step renders all the runtime env (project name, port, image tag, Grafana creds) into `/srv/orrery/.env` atomically each deploy — mirrors podcast_scraper deploy.yml lines 147-218 exactly. Sentry vars are passed to the build step directly (PUBLIC_ prefix means SvelteKit bakes them into the bundle).

Same Grafana Cloud stack as podcast_scraper is the recommended pattern — both apps' logs ship to the same Loki, separated by the `app` label (orrery's agent stamps `app=orrery` via `external_labels` in `ops/observability/grafana-agent.yaml`). Query orrery-only with `{app="orrery"}`.

---

## Triggering a deploy

Until the workflow is upgraded to `push: branches: [main]`, all deploys are manual:

```bash
gh workflow run "Deploy to prod VPS (orrery)" --ref main
```

Optional input: `override_image_sha` to pin a specific `:sha-<7>` tag (useful for rollback to a known-good build).

The workflow:

1. Pre-flight checks the three required secrets/vars are set; warns + skips on missing.
2. Checks out the repo.
3. Resolves the target image SHA (defaults to current main HEAD short).
4. Builds the static bundle on the runner (`npm ci && npm run build`) with `PUBLIC_SENTRY_DSN`/`PUBLIC_SENTRY_ENVIRONMENT`/`PUBLIC_SENTRY_RELEASE` exported so vite bakes them in.
5. Joins the tailnet.
6. Installs the SSH key (validates it's a loadable OpenSSH PEM before continuing).
7. Rsyncs `build/` to `/srv/orrery/build/`.
8. **Stages `/srv/orrery/.env`** from GH `prod`-scoped secrets — atomic, shm-backed tmpfile, never on the runner's disk.
9. SSH'es in: `git fetch + reset --hard origin/main` + `source ./.env` + `docker compose --env-file .env --profile observability pull/up web grafana-agent` + loopback healthcheck on `:ORRERY_PORT`.
10. Re-arms tailscale serve via the root-owned wrapper (`sudo -n /usr/local/sbin/orrery-tailscale-serve.sh`, 3-attempt retry, WARN-not-fail).
11. External healthcheck over tailnet at `https://<PROD_TAILNET_FQDN>:8443/`.

Total: ~3–5 min for a no-op deploy, ~5–7 min when the pipeline-runner image is a fresh SHA (new layers to pull).

---

## Verifying

From any tailnet member:

```bash
curl -fsS https://<PROD_TAILNET_FQDN>:8443/ | head -c 200
# Should return the orrery index.html shell — <!doctype html>...<title>Orrery</title>...
```

Browse: `https://<PROD_TAILNET_FQDN>:8443/` — full app, with the live `/data` overlay if your cron has run pipeline-runner since deploy.

---

## Rollback

Re-run the workflow with `override_image_sha` set to the previously-deployed SHA:

```bash
gh workflow run "Deploy to prod VPS (orrery)" \
  --ref main \
  --field override_image_sha=abc1234
```

For the static bundle, check out the previous commit locally and re-run the deploy:

```bash
gh workflow run "Deploy to prod VPS (orrery)" --ref <previous-commit-sha>
```

---

## Adding `push: branches: [main]` (graduation step)

After 3–5 successful manual deploys, add the auto-trigger by editing `.github/workflows/deploy-prod.yml`:

```yaml
on:
  workflow_dispatch:
    inputs:
      override_image_sha:
        description: "..."
  workflow_run:
    workflows: [docker-e2e]    # gate: deploy only after docker-e2e green
    types: [completed]
    branches: [main]
```

Add a top-level job condition so the workflow_run leg only fires on success:

```yaml
jobs:
  deploy:
    if: |
      github.event_name == 'workflow_dispatch'
      || github.event.workflow_run.conclusion == 'success'
```

This makes orrery's deploy chain: `push to main → docker-e2e (mobile + desktop matrix + publish) → deploy-prod (auto)`.

Until then, every push needs a manual `gh workflow run`.

---

## Troubleshooting

### Workflow fails on "Missing prereqs"

The three secrets/vars in §"GitHub Actions setup" aren't all set. Set them, re-run.

### Tailnet probe times out

Run on the VPS:

```bash
sudo tailscale serve status
# Should list 8443 → http://127.0.0.1:8090
```

If `:8443` isn't there, the systemd ExecStartPost didn't run. Inspect:

```bash
sudo journalctl -u tailscaled.service --since "10 min ago" | grep -i orrery
```

If `:8443` is registered but the probe still fails, the web container isn't responding on `:8090`. Inspect:

```bash
cd /srv/orrery
docker compose -p orrery -f compose/docker-compose.prod.yml ps web
docker compose -p orrery -f compose/docker-compose.prod.yml logs --tail 30 web
```

### Compose pull fails with `manifest unknown`

The pipeline-runner image hasn't been published yet. Verify:

```bash
docker pull ghcr.io/chipi/orrery-pipeline-runner:main
```

If 404 — the docker-e2e publish job hasn't run successfully yet on main. Check Actions tab for a green run with both matrix legs (desktop + mobile) succeeded, then publish job ran.

### Rsync 'permission denied' on /srv/orrery/build/

`deploy@` user doesn't own the directory. On VPS:

```bash
sudo chown -R deploy:deploy /srv/orrery/build /srv/orrery/static/data
```

---

## What's NOT in phase 1

- Public DNS / Let's Encrypt cert — phase 2 (#260 §"Phase 2").
- Auto-deploy on push-to-main — defer until manual deploys have proven stable.
- Grafana Cloud log shipping — ADR-068 has the wiring; env vars are blank by default. Set them in `/srv/orrery/.env` when you're ready.
- Sentry — ADR-067 same story.
- Backup of `/srv/orrery/static/data` — the data is derivable (every pipeline run rebuilds it). If derivability turns out to be slow, add a backup job pattern from podcast_scraper.
