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
values for the client), both Playwright configs, `scripts/capture-screenshots.ts`,
and `scripts/workspace/with-env.mjs` (the `lab-api:dev` / `mcp:dev` servers,
which don't read env files themselves).

## Docker Compose

`docker-compose.yml` names nothing globally (no `container_name`, image tag
or volume `name:`), so Compose scopes everything to the project name. The
generated `docker-compose.override.yml`, merged automatically by any
`docker compose` run in the checkout, sets `name: orrery-<stream>`
(`orrery-main` in the primary) and, for a side stream, replaces the web host
port (`ports: !override`). Services still reach each other by service name on
the project's own network. `npm run docker:reset-data` is now
`docker compose down -v`: this checkout's project only.

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

## Not handled here

Dependencies (`npm ci`) aren't installed by setup: run it in a new stream
before starting servers. Capacitor `dev:ios` / `dev:android` still read
`VITE_DEV_PORT` from the shell only. The lab-api `LAB_STATE_PATH` default is
the shared `/srv/lab-api-state/state.json`; set it per checkout if two
lab-apis run at once.
