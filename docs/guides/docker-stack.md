# Docker stack — local serving + on-demand pipelines

The `docker-compose.yml` at repo root brings up a production-shape nginx that serves the static SvelteKit bundle, plus an on-demand pipeline runner that executes any `tsx scripts/<name>.ts` inside a container with the full Node + system-gdal stack baked in. Per **[RFC-024](../rfc/RFC-024.md)** the stack is *local* + *CI*; VPS deploy + GHCR publishing are deferred to a future RFC. **GH Pages remains the canonical production site.**

The docker stack lets you (a) exercise the production-shape nginx-served bundle locally — cache headers, MIME types, SPA fallback — exactly the way the future VPS will serve it, (b) run heavy pipelines like `fetch:launches` or `images:hotspots` without needing system gdal on your laptop, and (c) trust a CI gate (`.github/workflows/docker-e2e.yml`) that the same stack works in a runner.

---

## First-time setup

```bash
npm install                    # if you haven't already — pulls package-lock.json deps
npm run build                  # produces ./build — the nginx container bind-mounts this
npm run docker:up              # docker compose up -d web — pulls nginx:alpine on first run (~5 s)
open http://localhost:8080     # the site, served by nginx, on port 8080
```

`docker compose up` starts only the `web` service. The `pipeline-runner` service is gated behind `profiles: ['manual']` and only spawns when you explicitly invoke `docker compose run --rm pipeline-runner …` (or one of the `npm run docker:*` wrappers below).

If you skip `npm run build`, the web container will start but every request returns 404 because there's nothing to serve — the bind-mount points at an empty directory. The compose file does not auto-build because (a) `npm run build` is a host concern (it runs vite which expects host-side `node_modules`) and (b) it's the same step you already run for GH Pages, so wiring it inside the docker bring-up would duplicate the contract.

---

## Tearing down

```bash
npm run docker:down            # stop + remove containers, keep volumes
docker compose down -v         # also wipe orrery-cache (image-cache for pipelines)
npm run docker:reset-data      # alias: removes the named volumes — next up re-creates them
```

`docker compose down` keeps the orrery-cache volume so the next pipeline invocation doesn't have to re-download HiRISE JP2s, the GCAT TSV, etc. Use `-v` (or `npm run docker:reset-data`) when you specifically want a cold first-run state.

---

## Running pipelines on-demand

Every `npm run …` data pipeline has a `npm run docker:…` mirror that runs the same script inside the pipeline-runner container:

```bash
npm run docker:fetch-launches          # scripts/fetch-launches.ts — refreshes launches.json
npm run docker:images:hotspots         # scripts/fetch-hotspot-imagery.ts — Mars/Moon orbital imagery
npm run docker:fetch-assets            # scripts/fetch-assets.ts — agency imagery + cache
npm run docker:validate-data           # scripts/validate-data.ts — ajv schema validation
npm run docker:build-image-provenance  # scripts/build-image-provenance.ts
npm run docker:build-link-provenance   # scripts/build-link-provenance.ts
npm run docker:audit-launches          # scripts/audit-report-launches.ts — emits HTML report
```

The first invocation in a fresh checkout triggers a **one-time pipeline-runner image build** (~5-10 min — Node 20 base + apt install gdal-dev + `npm ci`). Subsequent invocations re-use the cached image and start in ~2-3 seconds. Source code is bind-mounted at runtime (read-only), so script edits don't require a rebuild.

You can pass arguments through:

```bash
docker compose run --rm pipeline-runner scripts/fetch-launches.ts --since 2026-05-01
docker compose run --rm pipeline-runner scripts/audit-report-launches.ts > /tmp/audit.html
```

Pipeline writes land in `./static/data` on the host (bind-mount). The web container's `/data/*` path is overlay-mounted at that same host directory, so a fresh `launches.json` shows up at `http://localhost:8080/data/launches.json` on the next request — no rebuild, no restart. The PWA service worker's `NetworkFirst` strategy (`vite.config.ts:90`) handles client-side freshness.

---

## What's where

```
.
├── Dockerfile                       — pipeline-runner only. Web uses stock nginx:alpine.
├── docker-compose.yml               — two services: web + pipeline-runner (manual profile)
├── .dockerignore                    — keeps the pipeline build context lean
├── ops/docker/nginx.conf            — cache headers, SPA fallback, gzip, mime types
├── docs/guides/docker-stack.md      — this file
└── .github/workflows/docker-e2e.yml — CI gate, Playwright against the live stack
```

Volumes:

- `orrery-cache` (named docker volume) — pipeline-side `.image-cache/` reuse across invocations.
- `./build`, `./static/data`, `./ops/docker/nginx.conf` (bind-mounts) — host paths the web container reads.

The web container itself has no Dockerfile and no persistent volume — it's stock `nginx:alpine` (25 MB image) with three read-only bind-mounts. Easy to reason about, fast to start.

---

## The `.env` file

Some pipelines accept secrets. Create `.env` at repo root (gitignored):

```ini
LL2_PATREON_KEY=lk_xxx        # optional Launch Library 2 Patreon tier key
```

`docker-compose` reads `.env` automatically and threads the values into the pipeline-runner container's environment. The web container doesn't read any secrets.

CI sets these directly via `${{ secrets.LL2_PATREON_KEY }}` in `docker-e2e.yml`; the `.env` file is local-only.

---

## CI — the docker-e2e gate

`.github/workflows/docker-e2e.yml` runs on every push to `main` and on PRs that touch the docker surface (`Dockerfile`, `docker-compose.yml`, `ops/docker/**`, `package-lock.json`, `playwright.config.ts`, or the workflow itself). It:

1. Runs `npm ci && npm run build` on the runner.
2. Brings up `docker compose up -d web`.
3. Curl-polls `http://localhost:8080/` until healthy (max 120s).
4. Smoke-tests the critical paths (root, sub-route, `/data/launches.json` with `Cache-Control: no-cache` and `Content-Type: application/json`).
5. Runs the **desktop-chromium** Playwright project with `PLAYWRIGHT_BASE_URL=http://localhost:8080`.
6. Uploads `playwright-report/` + dumps `docker compose logs web` on failure.

Mobile-chromium is **not** covered here — that suite runs in `e2e.yml` against `vite preview`. The two workflows partition the test surface: `e2e.yml` exercises the SvelteKit + Vite artefact; `docker-e2e.yml` exercises the production-shape nginx-served bundle. A red `docker-e2e.yml` means *the docker stack regressed* (cache headers, SPA fallback, mime types, volume mount) — a specific signal, easy to attribute.

---

## Troubleshooting

### `Bind for 0.0.0.0:8080 failed: port is already allocated`

Something else is on `:8080`. Find it (`lsof -i :8080`) and stop it, or temporarily edit the port mapping in `docker-compose.yml` (`'8080:80'` → `'8081:80'`) and use `http://localhost:8081` for that session.

### Web container starts but every request 404s

`./build` doesn't exist. Run `npm run build` on the host first, then `docker compose restart web`.

### `404 Not Found` for `/missions/` but `/missions` works

That was a real bug we fixed early in Slice 1 — adapter-static emits `build/missions.html` (file at root) rather than `build/missions/index.html`. `ops/docker/nginx.conf` is configured to try `$uri.html` before falling through to `/index.html`. If you see it again, your nginx.conf may have drifted.

### Pipeline image build fails on `libgdal-dev`

The pipeline-runner Dockerfile installs system gdal via `apt-get install libgdal-dev`. If that fails, the apt mirror may be transiently unavailable. Re-run; if it fails again, check `https://www.debian.org/mirror/list` and your network. macOS hosts running Docker Desktop don't need host-side gdal — that's the whole point of the pipeline-runner image.

### Pipeline writes don't show up on `:8080`

The bind-mount points at `./static/data` on the host. If you wrote to `./build/data` instead (which adapter-static populates *at build time*), the web container won't see it because that path is masked by the static-data overlay. Always write through the pipeline-runner (which mounts `./static/data:/repo/static/data` read-write) — that path is correct by construction.

### Docker Desktop holds ~8 GB of RAM even when idle

That's the Apple Virtualization Framework VM that hosts the Linux docker engine on macOS. The default reservation is 8 GB; you can lower it via *Docker Desktop → Settings → Resources → Memory*. 4 GB is usually enough for this stack.

### Build context > 1 GB

Should be impossible with the current `.dockerignore`, which excludes `node_modules`, `.svelte-kit`, `build`, `test-results`, `.image-cache`, `.linux-node-modules`, `.xdg-cache`, `.xdg-data`. If you see "transferring context: XGB" in `docker compose build` output, run `du -h -d 2 . | sort -h | tail -20` to find the leak and add it to `.dockerignore`.

### macOS bind-mount permission errors inside the pipeline container

The pipeline-runner runs as root inside the container. Docker Desktop on macOS uses `virtiofs` for bind-mounts, which usually handles ownership transparently. If you see `EACCES` on host paths, restart Docker Desktop — its virtiofs daemon sometimes drifts after long uptime.

---

## Future work (not in this guide)

These are spelled out in RFC-024 §10. None are implemented today:

- GHCR publishing pipeline (push images to `ghcr.io/<owner>/orrery` on merge to main).
- VPS host configuration (Caddy reverse proxy + Let's Encrypt + watchtower).
- Scheduled pipelines on the VPS (replace `refresh-launches.yml` GH Actions cron with `systemd.timer`).
- Production hardening (non-root user, read-only rootfs, distroless base).
- Multi-arch builds (`linux/arm64` if the VPS choice ends up arm-based).

Each will become its own RFC + ADR set when the user prioritises it.

---

*Orrery · docs/guides/docker-stack.md · 2026-05-22 — Slice 3 of RFC-024 implementation*
