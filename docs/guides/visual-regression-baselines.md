# Visual regression baselines — regeneration workflow

`tests/e2e/visual.spec.ts` is a small pilot suite that compares element-scoped screenshots of three layout-stable surfaces (`/credits` header, `/library` header, `/science` tab strip) against committed baselines. Six baselines per platform (3 surfaces × 2 viewports), times two platforms (darwin + linux) = **12 PNGs** in `tests/e2e/visual.spec.ts-snapshots/`.

The two platforms exist because **Playwright suffixes baseline filenames with the host OS** (`*-darwin.png` on macOS, `*-linux.png` on the GitHub Actions ubuntu-latest runner). A baseline generated on darwin will be flagged as "missing baseline" on linux, and vice versa — Chromium's font hinting and sub-pixel rendering produce different PNG bytes on different OSes even for identical DOM.

This guide is the recipe for regenerating both sets in lockstep whenever a covered layout changes.

---

## When to regenerate

You **must** regenerate both sets together when any of these change:

- A CSS rule that affects the `section.credits > header.head` element on `/credits`.
- A CSS rule that affects the `section.library > header.head` element on `/library`.
- The `/science` tab strip layout (any of `main`, `.science-page`, `nav.tabs` on the landing).
- A font (file or `font-display` rule) that the affected pages render.
- A token in `src/styles/tokens.css` that any of the above consume.

If you change the page's content (e.g. add a new section ID, rename a tab) you might also need to update the `selector` in `STABLE_ELEMENTS` at the top of `visual.spec.ts` — re-baselining isn't enough on its own.

You **must NOT** regenerate baselines as a way to silence a failing test. If `visual.spec` fails on a PR, that's the test doing its job — find the unintended layout change first.

---

## Regenerating darwin baselines (host)

Run on your local macOS dev machine:

```bash
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
```

This writes the six `*-darwin.png` files. Confirm with `git status tests/e2e/visual.spec.ts-snapshots/` — you should see 6 modified files.

If you see ZERO modified files after running, the layout you changed isn't covered by `STABLE_ELEMENTS` (so visual.spec didn't notice the change). Either widen the selectors or pick a different verification approach.

---

## Regenerating linux baselines (Docker)

Requires the Docker daemon to be running (Docker Desktop on macOS, or `dockerd` on Linux). The image is **~1.2 GB** on first pull; subsequent runs are cached.

```bash
npm run regen-visual-baselines-linux
```

(Or directly: `./scripts/regenerate-visual-baselines-linux.sh`.)

The script:

1. Pulls `mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble` — pinned to the exact `@playwright/test` version in `package.json`, so the bundled Chromium matches CI.
2. Mounts the repo at `/repo` and a host-side `.linux-node-modules/` (gitignored) at `/repo/node_modules` — this OVERLAYS your darwin `node_modules` so the container sees Linux-native binaries (esbuild, paraglide, etc.) and the host install stays untouched.
3. Runs `npm ci --include=optional` on first invocation (one-time, ~60 s) to populate `.linux-node-modules/`.
4. Runs `npm run build` (vite preview needs `build/`).
5. Runs `npx playwright test tests/e2e/visual.spec.ts --workers=1 --update-snapshots`.

After the script exits, `git status tests/e2e/visual.spec.ts-snapshots/` should show six new or modified `*-linux.png` files.

### Why not just generate linux baselines in a GH Actions workflow?

You can — `workflow_dispatch` an `--update-snapshots` run, then commit the artifact. But the local Docker path is faster (no PR cycle), produces the same bytes as CI (the Docker image is the same one GH Actions uses for the playwright action), and means baseline regeneration doesn't need a special workflow. The script is the cheapest abstraction over `docker run + bind-mount`.

---

## Verify both sets pass before pushing

After regenerating:

```bash
# Darwin sanity (fast — ~10 s)
npx playwright test tests/e2e/visual.spec.ts --workers=1

# Linux sanity (slower — ~30 s after first pull because docker)
docker run --rm --ipc=host --user "$(id -u):$(id -g)" \
  -v "$(pwd)":/repo \
  -v "$(pwd)/.linux-node-modules":/repo/node_modules \
  -w /repo -e CI=true -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  mcr.microsoft.com/playwright:v1.60.0-noble \
  npx playwright test tests/e2e/visual.spec.ts --workers=1
```

Both should show `6 passed`. If either set fails, the regeneration didn't take — investigate before pushing.

---

## Commit conventions

- Always commit **both** `*-darwin.png` AND `*-linux.png` in the **same** change. Mixing platforms across commits means a future bisect can land on a half-baselined state that fails CI on linux but passes locally on darwin (or vice versa).
- Include the *why* in the commit message: which CSS/layout change is being baselined. "regenerate baselines" with no context rots when the next regeneration happens 6 months later.
- Don't commit baselines for OSes you didn't actually run on. If you only have a darwin machine, don't manually fabricate `*-linux.png` files — use the Docker script.

---

## Failure modes seen so far

### `npm ci` fails with `EACCES` writing to `/.npm`

The Playwright Docker image creates a default `~/.npm` owned by root. If `--user $(id -u):$(id -g)` is set (which we do, so PNGs aren't root-owned), npm can't write the cache. **Fix:** the script sets `HOME=/tmp` + `npm_config_cache=/tmp/.npm` to redirect both. Don't remove those env vars.

### `esbuild` crashes with "you installed esbuild for another platform"

Happens when the container can see darwin native binaries from the host's `node_modules`. **Fix:** the script overlays `.linux-node-modules/` at `/repo/node_modules` so the container has its own Linux install. If you see this error, check the overlay mount is actually there in the `docker run` invocation.

### Baselines change unexpectedly on every regeneration

Likely a non-deterministic render — animation that didn't settle, font that loaded mid-paint, dynamic timestamp on the page. The spec already does `requestAnimationFrame ×2` to settle fonts; if that's not enough, the surface isn't actually "layout-stable" and shouldn't be in `STABLE_ELEMENTS`.

---

## When CI says "missing baseline" anyway

The Playwright suffix depends on `process.platform` at run time, not at write time. If CI is reporting `*-linux.png` missing for a baseline that visibly exists in `tests/e2e/visual.spec.ts-snapshots/`, check:

- Is the file actually committed and pushed? `git ls-files tests/e2e/visual.spec.ts-snapshots/` from the PR head.
- Are you on a different Playwright version? The Docker image tag is pinned to the host `package.json` version; if you bumped `@playwright/test` without re-running the script, the image / baselines may have drifted.
- Did a font file or static asset change without a corresponding baseline regeneration? `git log -- static/fonts/` since the baselines were last committed.

---

## Tracking

- Issue #132 (closed) — initial linux baseline generation and removal of the darwin-only `test.skip`.
- `scripts/regenerate-visual-baselines-linux.sh` — automation source of truth.
- `tests/e2e/visual.spec.ts` — the spec itself; comment block at the top of the test block points back here.
