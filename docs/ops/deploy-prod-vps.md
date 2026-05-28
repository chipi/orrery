# Deploy orrery to prod VPS — operator runbook

GH #260 phase 1 (tailnet-only). Standing orrery up on the existing always-on Hetzner VPS that also hosts podcast_scraper.

Phase 2 (public DNS + TLS) is **deferred** — see #260 §"Phase 2".

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

## VPS prerequisites — already satisfied by podcast_scraper

orrery rides on the existing tailnet node where podcast_scraper runs. The following are already in place via podcast_scraper's Terraform / cloud-init in its own repo:

- ✅ VPS provisioned (Hetzner CAX) with tailnet identity registered
- ✅ `deploy@` user exists, in the `docker` group
- ✅ `deploy@` `~/.ssh/authorized_keys` includes the deploy key matching `PROD_SSH_PRIVATE_KEY`
- ✅ Docker engine + `docker compose` plugin installed
- ✅ Hetzner firewall: 22/SSH + ICMP only; all other ports private

orrery adds **zero** to that list. The deploy workflow handles everything else idempotently on each run.

---

## Zero-touch first deploy

The deploy workflow auto-bootstraps `/srv/orrery/` on first run:

1. SSHes into VPS as `deploy@`
2. Clones the repo into `/srv/orrery` if missing
3. Scaffolds `/srv/orrery/.env` if missing (with `ORRERY_PORT=8090` + `COMPOSE_PROJECT_NAME=orrery`)
4. Rewrites `ORRERY_PIPELINE_IMAGE_TAG` to the current deploy SHA
5. Rsyncs the CI-built `build/` into `/srv/orrery/build/`
6. `git pull` + `docker compose pull web pipeline-runner` + `docker compose up -d web`
7. Loopback healthcheck on `:ORRERY_PORT`
8. `tailscale serve --bg --https=8443 8090` (registers if not already; no-op if already registered to the right backend)
9. External tailnet probe at `https://<PROD_TAILNET_FQDN>:8443/`

**No sudo. No systemd touch. No `/usr/local/sbin` writes.** All operations run as the `deploy@` user. The whole bootstrap surface is captured in `.github/workflows/deploy-prod.yml`.

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

In the orrery repo settings → **Secrets and variables → Actions**:

| Type | Name | Value |
|---|---|---|
| Secret | `TS_AUTHKEY` | Tailscale auth key with `tag:gha-deployer`. Reusable, 90-day expiry recommended. |
| Secret | `PROD_SSH_PRIVATE_KEY` | Ed25519 PEM (private key matching `~/.ssh/authorized_keys` of `deploy@` on the VPS). |
| Variable | `PROD_TAILNET_FQDN` | The MagicDNS host of the VPS, e.g. `orrery-host.<tailnet>.ts.net`. Same host that serves podcast_scraper; orrery uses a different tailscale-serve port (:8443). |

---

## Triggering a deploy

Until the workflow is upgraded to `push: branches: [main]`, all deploys are manual:

```bash
gh workflow run "Deploy to prod VPS (orrery)" --ref main
```

Optional input: `override_image_sha` to pin a specific `:sha-<7>` tag (useful for rollback to a known-good build).

The workflow:

1. Pre-flight checks all three secrets/vars are set; warns + skips on missing.
2. Checks out the repo.
3. Resolves the target image SHA (defaults to current main HEAD short).
4. Builds the static bundle on the runner (`npm ci && npm run build`).
5. Joins the tailnet.
6. Installs the SSH key.
7. Updates `/srv/orrery/.env` with the resolved image tag (idempotent).
8. Rsyncs `build/` to `/srv/orrery/build/`.
9. SSH'es in: `git pull` + `docker compose pull web pipeline-runner` + `docker compose up -d web` + loopback healthcheck on `:ORRERY_PORT`.
10. External healthcheck over tailnet at `https://<PROD_TAILNET_FQDN>:8443/`.

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
