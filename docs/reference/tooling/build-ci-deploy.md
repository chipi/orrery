# Build / CI / Deploy tooling

Reference for the durable build, lint, test, release, and deploy tooling in Orrery —
the npm meta-targets in `package.json` and the scripts under `scripts/` they wrap, plus
the GitHub Actions workflows in `.github/workflows/`. This is a catalogue, not a tutorial:
for the *why* behind the asset/provenance pipelines see [TA.md §pipelines](../../adr/TA.md#pipelines),
and for the day-to-day push discipline see [AGENTS.md §"Preflight before push"](../../../AGENTS.md).

## Quick reference

| Tool | Command | When |
|------|---------|------|
| Build | `npm run build` | Produce the static `build/` bundle (prerendered, pruned, verified) |
| Preview | `npm run preview` | Serve `build/` locally via vite preview |
| Typecheck / check | `npm run typecheck` / `npm run check` | svelte-check over the tree |
| Lint | `npm run lint` (`:prettier`, `:eslint`) | Format + lint gate |
| Format | `npm run format` | Write prettier fixes |
| Unit test | `npm run test` (`:coverage`) | vitest run |
| E2e | `npm run test:e2e` / `:e2e:smoke` | Playwright against built bundle |
| Preflight | `npm run preflight` / `:full` / `ci` | Pre-push gate (smart subset / full) |
| Secret scan | `npm run check-no-secrets` (`:all`) | Credential-pattern gate |
| Release rehearsal | `npm run release:rehearsal vX.Y.Z` | Pre-tag full-gate dry run |
| Linux baselines | `npm run regen-visual-baselines-linux` | Regenerate CI-matching visual PNGs |
| Screenshots | `npm run screenshots` | README / guide screenshots |
| Colophon thumbs | `tsx scripts/capture-colophon-thumbs.ts` | /colophon WebP thumbnails |
| Mockups | `node scripts/mockups/render-*.mjs` | Slice-0 visual previews (docs) |
| Docker | `npm run docker:*` | Local compose stack + pipeline-runner |
| Deploy prod | `gh workflow run "Deploy to prod VPS (orrery)"` | Manual VPS deploy |
| Deploy preview | auto on docker-e2e green / `gh workflow run "Deploy preview"` | GH Pages app+docs publish |

---

## `npm run build`

**Command** — `npm run build`
**What** — Full static build chain: `i18n:compile → validate-data → build-science-index →
precompute-porkchops → vite build → prune-build-staging → check-prerender-completeness`.
Emits `build/` (the deploy unit).
**When** — Inside preflight, before e2e, in every deploy workflow, before screenshots.
**I/O** — Writes `build/`; reads `static/data/`, `messages/`, `project.inlang/`.
**Gotchas** — Two post-build guards run *after* `vite build` and can fail a build that
otherwise compiled clean (see prune + prerender sections). `VITE_BASE=/orrery/` switches on
the GH Pages subdirectory mount (see `gh-pages-compat.mjs`).
**State** — healthy.

## `npm run preview` / `check` / `typecheck`

**Command** — `npm run preview` | `npm run check` | `npm run typecheck`
**What** — `preview` = `vite preview` over `build/`. `check` and `typecheck` are identical:
`i18n:compile → svelte-kit sync → svelte-check`.
**When** — `preview` for eyeballing a prod bundle; `typecheck` in preflight.
**Gotchas** — `preview` does not build; run `npm run build` first.
**State** — healthy. Opportunity: `check` and `typecheck` are byte-identical scripts —
one could alias the other.

## Lint / format

**Command** — `npm run lint` (= `lint:prettier` + `lint:eslint`), `npm run format`
**What** — `lint:prettier` = `prettier --check --cache .`; `lint:eslint` = eslint with a
cache at `node_modules/.cache/eslint-cache`; `format` = `prettier --write .`.
**When** — In preflight; `format` before committing.
**Gotchas** — Some Claude Code sessions rewrite prettier `[warn]` output to a false
"all formatted" line while still exiting 1 — trust the exit code (CLAUDE.md §"Bash output filtering").
**State** — healthy.

## Test (`test`, `test:coverage`, `test:e2e`, `test:e2e:smoke`)

**Command** — `npm run test` | `test:coverage` | `test:e2e` | `test:e2e:smoke`
**What** — `test` = `vitest run --passWithNoTests`. `:coverage` adds v8 coverage.
`:e2e` = `npm run build && playwright test` (all projects). `:e2e:smoke` = build +
`--workers=1 --project=desktop-chromium` over `landing.spec.ts` + `smoke.spec.ts`.
**When** — `test` in preflight; e2e before tagging (both `desktop-chromium` AND
`mobile-chromium`); smoke for a fast sanity check.
**Gotchas** — Always pass `--workers=1` for e2e: the shared vite preview server crashes
under the default 2 workers. Preflight does NOT run e2e.
**State** — healthy.

## `npm run preflight` → `scripts/preflight-smart.mjs`

**Command** — `npm run preflight` (= `with-lock preflight -- node scripts/preflight-smart.mjs`).
`npm run ci` aliases it.
**What** — Smart runner: `git fetch origin main`, diffs `origin/main...HEAD` + working tree,
categorizes changed paths, and runs only the relevant check subset. Routing: docs-only →
secret scan; data-only → validate-data + build; messages-only → i18n + typecheck + build;
audio-only → audio cost + build; tests-only → vitest `--changed` + build; source-code →
typecheck + lint + vitest `--changed` + validate-data + secrets + build; static-asset-only →
build. Any config-file or unrecognised path → FULL.
**When** — Pre-push gate (husky `pre-push` auto-runs it). Mirrors CI.
**I/O** — Reads git diff; strips generated `src/lib/paraglide/` from the change set.
**Gotchas** — Pre-push gate, NOT a mid-iteration checkpoint. Does NOT run e2e (release
rehearsal covers that). Set `PREFLIGHT_OFFLINE=1` to skip `git fetch` on no-network runners.
In `bash -c` wrappers always `set -o pipefail` before reading `EXIT=$?` after `| tail`.
**State** — healthy.

## `npm run preflight:full`

**Command** — `npm run preflight:full` (= `with-lock preflight -- npm run preflight:full:body`)
**What** — Unconditional full chain: `typecheck → lint → test → validate-data →
audio:check-cost → check-no-secrets:all → build`. The smart runner's `full` mode dispatches
to the same `preflight:full:body`.
**When** — Manual escape hatch when you don't trust the smart subset.
**State** — healthy.

## `scripts/with-lock.mjs`

**Command** — `node scripts/with-lock.mjs <name> -- <command> [args...]`
**What** — POSIX file mutex (atomic `mkdir` at `$TMPDIR/orrery-<name>.lock`) around a child
command. Prevents two concurrent `preflight`/`build` runs from racing on `.svelte-kit/output`
rimraf (the `ENOTEMPTY` phantom failure). Writes `{pid,ts,cmd}` for diagnosis; auto-clears
stale locks (>30 min); bounded 1 h wait then exits 124.
**When** — Wraps both preflight targets. Reusable for any tool that writes `.svelte-kit/`,
`node_modules/.vite`, or `build/`.
**Gotchas** — SIGKILL/crash leaves a lock the next acquire clears as stale.
**State** — healthy.

## `scripts/prune-build-staging.mjs`

**Command** — runs in `npm run build` (`node scripts/prune-build-staging.mjs`)
**What** — adapter-static copies all of `static/` into `build/`, including the gitignored
`build/images/_staging` review scratch area. This removes it, then walks `build/` to assert
no `_staging` survived — a leak fails the build.
**When** — Post-`vite build`, automatically.
**I/O** — Deletes `build/images/_staging`.
**State** — healthy.

## `scripts/check-prerender-completeness.mjs`

**Command** — runs in `npm run build`
**What** — Post-build guardrail against silent prerender drops (the #342 regression where the
build emitted only the en-US tree, ~18 HTML files). Asserts every non-base locale in
`project.inlang/settings.json` has its root HTML and total HTML count ≥ 200.
**When** — Post-`vite build`, automatically.
**I/O** — Reads `build/` + `project.inlang/settings.json`.
**Gotchas** — Floor is a coarse 200; does not check per-route × per-locale completeness
(Playwright e2e covers content correctness).
**State** — healthy.

## `scripts/gh-pages-compat.mjs`

**Command** — imported by `vite.config.ts` + `svelte.config.js` (not run directly)
**What** — GH Pages subdirectory-mount helpers, active only under `VITE_BASE=/orrery/`.
`ghPagesUrlPatterns(base)` injects Paraglide `urlPatterns` so the locale matcher looks
*after* the base prefix; `expandLocalizedRoots(routes)` inlines per-locale prerender entries
(stable across svelte.config re-evaluation). Both return inert values when base is empty, so
the VPS root-mount build is unaffected.
**When** — Build time on the GH Pages path.
**Gotchas** — `LOCALES` is a hand-maintained mirror of `project.inlang/settings.json`; the two
must stay in sync. Delete this file + call sites when GH Pages is retired (`git grep gh-pages-compat`).
**State** — current. Opportunity: locale list duplication is a known drift hazard.

## `npm run release:rehearsal` → `scripts/release-rehearsal.ts`

**Command** — `npm run release:rehearsal vX.Y.Z`
**What** — Codifies the AGENTS.md pre-tag checklist as one command: (0) offer to bump
`package.json` + scaffold a `## [X.Y.Z]` CHANGELOG section, (1) preflight, (2) e2e
`desktop-chromium`, (3) e2e `mobile-chromium`, (4) extract the CHANGELOG body via awk to
`/tmp/release-body-vX.Y.Z.md`, (5) create/update a DRAFT GH Release (idempotent).
**When** — Before tagging a release. Enforces "preflight is not enough to ship" (preflight
excludes e2e).
**Gotchas** — Calls playwright directly with `--workers=1` to avoid the `test:e2e` double-build.
Auto-fix prompts are skipped in non-TTY/CI. Step 5 skips gracefully if `gh` is unauthenticated.
**State** — needs-attention: `changelogPath` is declared with `const` twice (Step 0 line ~123
and Step 4 line ~180) — a redeclaration in module scope. De-dupe to the top.

## `npm run regen-visual-baselines-linux` → `scripts/regenerate-visual-baselines-linux.sh`

**Command** — `npm run regen-visual-baselines-linux`
**What** — Regenerates `tests/e2e/visual.spec.ts` baselines inside the official
`mcr.microsoft.com/playwright:v<ver>-noble` image (pixel-matches the CI ubuntu runner).
Caches Linux `node_modules` in `.linux-node-modules/` (gitignored) so the host darwin tree is
untouched; builds, then runs visual.spec with `--update-snapshots`.
**When** — Whenever a /credits, /library, or /science header layout changes — regen the darwin
baselines in the SAME commit so the two never diverge.
**I/O** — Writes `tests/e2e/visual.spec.ts-snapshots/`.
**Gotchas** — Requires Docker (~1.2 GB first pull). Pins the image to the `@playwright/test`
devDependency version; `npm ci` uses `--ignore-scripts` (gdal/sharp native builds fail in
the playwright image and aren't needed for visuals).
**State** — healthy.

## `npm run screenshots` → `scripts/capture-screenshots.ts`

**Command** — `npm run screenshots` (= build + `tsx scripts/capture-screenshots.ts`)
**What** — Spawns its own `vite preview` (port 4173) and drives Chromium serially through the
`SHOTS` array (every route + interaction state) into committed `docs/screenshots/` PNGs.
**When** — When a showcased screen/interaction changes. Add a `Shot` entry for new states.
**I/O** — Writes `docs/screenshots/`.
**Gotchas** — Serial by design for determinism; uses `reducedMotion: 'reduce'` to freeze simT.
**State** — healthy.

## `scripts/capture-colophon-thumbs.ts`

**Command** — `BASE=http://localhost:5373 npx tsx scripts/capture-colophon-thumbs.ts`
(env: `SUBSET=models|scenes|all`)
**What** — Captures the 800×560 WebP thumbnails the /colophon page shows for live-rendered 3D
models (`/dev/models`) + procedural scene overlays, encoded via sharp.
**When** — When colophon model/scene thumbnails need refreshing.
**I/O** — Writes `static/images/colophon/`.
**Gotchas** — Connects to an ALREADY-RUNNING dev server (does not spawn one) — never kill
Marko's :5373. Hides site nav/footer before capture.
**State** — healthy.

## `npm run check-no-secrets` (`:all`) → `scripts/check-no-secrets.ts`

**Command** — `npm run check-no-secrets` (staged diff) / `check-no-secrets:all` (full tree)
**What** — Fail-closed regex sweep for credential shapes (Sentry DSN, Grafana `glc_`,
Anthropic `sk-ant-`). Staged-diff mode for pre-commit/preflight; `--all` (`git ls-files`) for CI.
Allowlist: `.env.example`, `docs/**`, `*.test.ts`/`*.spec.ts`, and the script itself.
**When** — In preflight (`:all`) and the husky pre-commit hook.
**Exit** — 0 clean, 1 match, 2 invocation error.
**Gotchas** — Do not `--no-verify` past a hit — rotate the credential first.
**State** — healthy.

## `scripts/check-no-secrets-in-image.sh`

**Command** — `scripts/check-no-secrets-in-image.sh <image-tag>`
**What** — Complement to the source scanner: scans a built Docker image's *filesystem* for
secret-pattern files (`.env`, `*.key`, `*.pem`, `id_rsa`, `credentials`, …) via `docker run …
find`. Belt-and-suspenders against `.dockerignore` drift. Excludes CA bundles, `/proc`,
`/sys`, and `node_modules` (public npm test fixtures).
**When** — The docker-e2e `publish` job, before pushing to GHCR.
**Exit** — 0 clean, 1 usage error, 2 secrets found (blocks publish).
**State** — healthy.

## Mockup renderers (`scripts/mockups/render-*.mjs`)

**Command** — `node scripts/mockups/render-surface-mockups.mjs` /
`node scripts/mockups/render-panorama-redesign.mjs`
**What** — One-off Slice-0 visual-preview generators. `render-surface-mockups` writes 12
surface-redesign frames (Mars + Moon × 6 zoom states, #283) into
`docs/mockups/surface-redesign/`; `render-panorama-redesign` writes 8 Tier-3 panorama frames
(#286 / ADR-074) into `docs/mockups/panorama-redesign/`. Both composite real textures/panoramas
under schematic SVG via Playwright at 1920×1080.
**When** — Visual-anchor step for a UX redesign, gated on Marko's approval (per the
"visual anchor before UX commit" pattern). Not part of build/CI.
**I/O** — Read `static/textures/` and `static/images/hotspots/`; write `docs/mockups/`.
**Gotchas** — `render-panorama-redesign` copies panoramas to temp files (Chromium silently
fails on data URLs >256 KB) and cleans up `_bg_*.jpg` after.
**State** — current (issue-scoped). Opportunity: candidates for archival once #283/#286 ship.

## Docker targets (`npm run docker:*`)

**Command** — `docker:build` | `up` (web -d) | `down` | `logs` (web -f) | `reset-data`
(rm `orrery-data`/`orrery-cache` volumes). Pipeline-runner one-shots: `docker:fetch-launches`,
`docker:images:hotspots`, `docker:fetch-assets`, `docker:validate-data`,
`docker:build-image-provenance`, `docker:build-link-provenance`, `docker:audit-launches`.
**What** — Wrap `docker compose` for the local stack; the `pipeline-runner` targets run a data
script once in the runner container (`docker compose run --rm pipeline-runner …`).
**When** — Local reproduction of the prod serving shape (cache headers, CSP, brotli/gzip, SPA
fallback) and offline-safe pipeline runs.
**Gotchas** — `docker:reset-data` is destructive (drops named volumes).
**State** — healthy.

---

## Deploy — GitHub Actions workflows

The deploy chain is `ci.yml → docker-e2e.yml → staging.yml`, with `deploy-docs.yml` branching
off CI directly and prod/release as separate manual/tag triggers.

### Deploy staging (`staging.yml`) — GH Pages app + docs

**Trigger** — `workflow_run` on **docker-e2e** completion (success only, branch main);
also `workflow_dispatch` and a weekly Monday 06:00 UTC cron (fresh imagery, ADR-016).
**What** — Builds with `VITE_BASE=/orrery/` + `npm run docs:build` (`DOCS_BASE=/orrery/docs/`),
copies docs into `build/docs`, publishes the full `build/` to the `gh-pages` branch.
**Manual** — `gh workflow run "Deploy staging" --ref main` (force-publish when the e2e gate
blocked the auto-deploy).
**Gotchas** — Deploys the exact SHA that passed docker-e2e. Shares concurrency group
`gh-pages-publish` with deploy-docs (serialized, no cancel-in-progress).

### Deploy docs (`deploy-docs.yml`) — docs-only

**Trigger** — `workflow_run` on **CI** success (branch main), plus `workflow_dispatch`.
Independent of e2e so docs fixes ship even when the app e2e suite is red (ADR-070).
**What** — Builds VitePress and publishes only `docs/.vitepress/dist` to `gh-pages` under
`docs/` with `keep_files: true` (overlay — leaves the app bundle intact).
**Manual** — `gh workflow run "Deploy docs" --ref main`.
**Gotchas** — Needs `npm run i18n:compile` + `npx svelte-kit sync` before `docs:build` (both
generate files svelte.config/tsconfig import but `npm ci` doesn't produce).

### Deploy to prod VPS (`deploy-prod.yml`)

**Trigger** — `workflow_dispatch` only, with optional `override_image_sha` input
(blank = `:main` image tag; the deployed app code is always main HEAD).
**What** — Builds the static bundle in CI (with `PUBLIC_SENTRY_*`), joins the tailnet via
Tailscale, rsyncs `build/` to `/srv/orrery/build/` on the Hetzner VPS, stages `.env` from
`prod`-scoped secrets, then SSHes to `git fetch+reset → docker compose pull/build/up` (web +
grafana-agent) and health-probes loopback + tailnet.
**Manual** — `gh workflow run "Deploy to prod VPS (orrery)"` (optionally
`-f override_image_sha=<7-char>` for pipeline-runner rollback).
**Gotchas** — Skips gracefully (warning, green) if `TS_AUTHKEY` / `PROD_SSH_PRIVATE_KEY` /
`PROD_TAILNET_FQDN` are unset. `override_image_sha` only affects the `pipeline-runner` image
(profile: manual), not the served app. Bootstrap (initial clone) is owned by podcast_scraper
cloud-init, not this workflow.

### Auto-publish GH Release on tag push (`release.yml`)

**Trigger** — `push` of a `v*` tag.
**What** — Extracts the `## [X.Y.Z]` CHANGELOG section (same awk recipe as release-rehearsal)
and creates/updates a GitHub Release. Stable tags get `--latest`; `vX.Y.Z-rc1`-style tags get
`--prerelease`. Idempotent.
**Gotchas** — Publishes the *tagged* commit's CHANGELOG, not main HEAD. Does NOT trigger the
Pages deploy (that chains through ci → docker-e2e → preview). Fails if the CHANGELOG section is
missing — add it, retag, push.
