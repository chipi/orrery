# `.config/workspace/` — Orrery runtime isolation for parallel checkouts

Lets the primary checkout (`/work/orrery/main`) and any number of Worktrunk
streams (`/work/orrery/worktrees/<stream>`) run at the same time without
sharing ports, Compose projects, containers, images, networks or volumes.

The generic part lives in the workstation repo
(`agentic-ai-homelab/workstation/streams/`, see its README, "Workspaces"):
`wb-workspace` derives the identity (`WORKSPACE_PROJECT`, `WORKSPACE_STREAM`,
`WORKSPACE_ID`, `WORKSPACE_PRIMARY`, `WORKSPACE_PATH`, `COMPOSE_PROJECT_NAME`)
and deterministic ports, and the Worktrunk user hooks call it. Everything
Orrery-specific is in the two scripts here.

| File | Run by | Does |
|---|---|---|
| `setup` | `wb-workspace setup`: Worktrunk `pre-start` for a new stream; **by hand once in the primary** | Writes `.env.workspace` + `docker-compose.override.yml` (both ignored, both generated). `--link-env`: see Secrets. |
| `teardown` | `wb-workspace teardown`: Worktrunk `pre-remove`, while the worktree still exists | Stops this checkout's Compose project; removes its explicitly disposable volumes (side streams only). |

Both are idempotent and refuse to overwrite a file they didn't generate.

## Ports

| Slot | Variable | Primary | Side stream |
|---|---|---|---|
| `web` | `VITE_DEV_PORT` (dev + preview) | 5273 (or your `.env.local`) | `wb-workspace port web` |
| `e2e` | `E2E_PORT` (Playwright, capture-screenshots) | 4173 | `wb-workspace port e2e` |
| `docker-web` | host port of Compose `web` | 8080 | `wb-workspace port docker-web` (in the override) |
| `lab-api` | `LAB_PORT`, `LAB_ISSUER`, `VITE_LAB_API_URL` | 8093 | `wb-workspace port lab-api` |
| `mcp` | `MCP_PORT` | 8091 | `wb-workspace port mcp` |

A side stream also gets `LAB_CORS_ORIGINS` / `LAB_WEB_REDIRECT_URIS` for its
own dev origin. Stream ports are 10000–19999 and never move: on a collision
`wb-workspace` fails and setup stops (rename the stream). See them with
`cat .env.workspace`.

**Precedence** (highest first): the shell environment → your own `.env` /
`.env.local` → `.env.workspace` → the built-in defaults above. So nothing you
already set is overridden, and without `.env.workspace` (CI, a fresh clone)
everything behaves exactly as before. Setup warns when your `.env` /
`.env.local` pins one of a stream's port values.

Who reads `.env.workspace`: `vite.config.ts` (dev/preview port; `VITE_*`
client values for the dev server), both Playwright configs, `scripts/capture-screenshots.ts`,
and `scripts/workspace/with-env.mjs` (the `lab-api:dev` / `mcp:dev` servers,
which don't read env files themselves).

The generated `VITE_*` client values (today `VITE_LAB_API_URL`) configure the
local Vite **dev server** only (`vite dev`). They are deliberately excluded from
every build (`npm run build`, `build:mobile`, the Docker/E2E and staging/prod
images keep the production/default lab-api URL unless you set one explicitly in
the shell or `.env*`) and from Vitest, which loads the same config
(`workspaceClientEnv` in `scripts/workspace/env.mjs`). So `npm run test` behaves
the same in every checkout; a test that needs a server listens on an
OS-assigned port (`listen(0)`), never a stream's ports.

## Lab-api state

`server/lab-api` keeps a mutable `state.json` (ES256 signing key, refresh-token
hashes, DCR clients) and reads an `allowlist.json` (permitted emails). Its
built-in defaults are the production paths `/srv/lab-api-state/{state,allowlist}.json`
(compose mounts `./lab-api-state` there); a normal user cannot create `/srv/...`,
so `npm run lab-api:dev` used to die with `EACCES: mkdir '/srv/lab-api-state'`.

| | State (`LAB_STATE_PATH`, mutable) | Allowlist (`LAB_ALLOWLIST_PATH`, read-only input) |
|---|---|---|
| Production / compose | `/srv/lab-api-state/state.json` (unchanged) | `/srv/lab-api-state/allowlist.json` (unchanged) |
| Any checkout with `.env.workspace` (primary **and** side streams) | `<this checkout>/.lab-api-state/state.json` | `<primary>/.lab-api-state/allowlist.json` |
| No `.env.workspace` (CI, fresh clone) | `./.lab-api-state/state.json` (`lab-api:dev` fallback) | `./.lab-api-state/allowlist.json` |

Decisions: the primary deviates from "keeps today's defaults" here, because
today's default is unusable without root; its state lives in its own ignored
`.lab-api-state/`. Two checkouts therefore never share a mutable token file.
The allowlist is config, not state, so side streams read the primary's single
file instead of each needing a copy; an absent file denies everyone (logged),
so create `/work/orrery/main/.lab-api-state/allowlist.json` (`{"emails":["you@example.com"]}`)
once. Setup writes only the two paths, never the files, and the server creates
`state.json` on first start. Override either variable in the shell or `.env.local`
(precedence as above). Only `lab-api:dev` applies these; the production image and
`configFromEnv()` defaults are untouched.

## Docker Compose

`docker-compose.yml` names nothing globally (no `container_name`, image tag
or volume `name:`), so Compose scopes everything to the project name. The
generated `docker-compose.override.yml`, merged automatically by any
`docker compose` run in the checkout, sets `name: orrery-<stream>`
(`orrery-main` in the primary) and, for a side stream, replaces the web host
port (`ports: !override`). Services still reach each other by service name on
the project's own network.

`web` serves **this checkout's own** `build/` (read-only bind mount). Without a
build, Compose stops with "bind source path does not exist: …/build"
(`create_host_path: false`, so Docker never creates an empty root-owned
`build/` that would break the nested `static/data` mount).
`npm run docker:reset-data` is `docker compose down -v`: this checkout's
project only.

**Use `npm run docker:e2e`** (after `npm ci`) to run the Docker stack:
1. it resolves this checkout's Compose project and `ORRERY_WEB_PORT` and
   refuses if `docker compose config` disagrees with `.env.workspace` (another
   stream's or the primary's service);
2. builds;
3. force-recreates **only this checkout's** `web` and waits for healthy;
4. runs the smoke checks, including that the served `/_app/version.json`
   equals the host build's;
5. runs Playwright against this checkout's port.

Options: `-- --skip-build`, `-- --smoke-only`, then `-- <playwright args>`.

**Why recreate: the stale-mount lifecycle.** Every build replaces `build/` with
a new directory. A `web` container started before the build keeps the old,
deleted directory mounted: nginx answers 500 (`/data/*` can 404) while the host
build is fine, and Docker's health status lags, so the container can still
report healthy. Recreating the container remounts the current `build/`. This
was reproduced by a plain build, by `npm run preflight`, and by the pre-push
hook. Recover without building:

```bash
npm run docker:e2e -- --skip-build --smoke-only
```

The version check, not the health status, is the proof the served bundle is
current.

## Secrets: never copied

`.env` (API keys, credentials) stays where you put it. A new stream starts
**without** one. If a stream needs the secrets, opt in explicitly:

```bash
wb-workspace setup --link-env    # in the stream: .env -> /work/orrery/main/.env (symlink)
```

A symlink, not a copy: one source of truth, and removing the worktree
removes only the link. `--link-env` refuses in the primary and never replaces
an existing `.env`. `.env.workspace` contains no secrets.

## Teardown and volumes

Scope is strictly `com.docker.compose.project=$COMPOSE_PROJECT_NAME`; no
global `prune`, no other project. `docker compose -p <name> down --remove-orphans`
stops the containers and removes the network. **Volumes are kept by default.**
The exception is a volume the compose file explicitly labels
`org.orrery.workspace.disposable: 'true'`: today only `orrery-cache`, which
holds re-downloadable upstream files (HiRISE, GCAT, LL2). Those are removed
when a **side stream** is torn down, so disposable worktrees don't leave
gigabytes of cache behind. Never in the primary. Pipeline output goes to
`static/data/` in the worktree itself, not to a volume.

A failing teardown stops `wt remove` (Worktrunk 0.68). It fails only when this
checkout's containers couldn't be stopped. No Docker or no daemon counts as
nothing to stop. Bypass, once understood: `wt remove --no-hooks <branch>`.

## Known limitations (Orrery)

Generic workstation limitations are listed once, in the workstation repo
(`agentic-ai-homelab/workstation/DEVELOPER-SETUP.md` → "Known limitations and
deferred work"). Orrery's own:

- **A build with `web` running stales it.** `docker:e2e` handles this for the
  Docker gate, but any other build (`npm run build`, preflight, the pre-push
  hook) leaves a running `web` serving the deleted `build/` until it's
  recreated (see above). The bind-mount design is unchanged on purpose.
- **Dependencies per stream.** Setup doesn't install anything: run `npm ci` in
  each new stream (about 1.2 GB `node_modules` each).
- **Images accumulate.** Teardown removes a stream's containers, network and
  disposable volumes, but not its built image (`orrery-<stream>-web`).
  Remove it by name if needed; never with a global prune.
- **Lab API allowlist is manual.** Absent or malformed, the lab API denies
  everyone. Setup never creates it.
- **Capacitor** `dev:ios` / `dev:android` still read `VITE_DEV_PORT` from the
  shell only.
- **Playwright flakes.** The full Docker E2E in Slice 4B ended with 730
  passed, 4 flaky, 38 skipped (exit 0). Those flakes are Orrery test issues,
  not workstation or isolation failures, and aren't fixed.

Validated in practice: workstation Slices 4A and 4B ran two Orrery streams
concurrently next to the primary, through to integration and push (evidence
in the workstation doc above).
