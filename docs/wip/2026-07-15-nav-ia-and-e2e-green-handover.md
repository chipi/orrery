# Handover — Nav IA restructure, science-diagram restyle, docker-e2e desktop shard back to green (2026-07-15)

Single-session handover. Everything below either shipped to `main` or is one
approved push away. Written for whoever picks up next.

## TL;DR

- **docker-e2e desktop-chromium 2-of-2 is green again.** It had been red on
  `mars-tier3` + two `tour-stage-execution` tests. Both root-caused and fixed
  (not timeout-papered — see below). Full 6-leg matrix green on `ced3069467`,
  now deploying to prod.
- **Nav IA restructure shipped**: flat 14-item bar → `Home · Explore▾ · Fly ·
  Plan · Catalog▾ · Learn▾`. Three new nav keys translated to all 14 locales.
- **Science diagrams** restyled top-down in the WIRED-blend style (48 done, 15
  deferred to #409 after Higgsfield renews 2026-07-22); all added to the
  colophon provenance wall.
- **One unpushed commit** as of writing: `42bb38c36a` (perf benchmark → warn,
  not gate). Held for push signal.

## What shipped to `main`

Commits (newest first on `origin/main` @ `ced3069467`):

- `ced3069467` test(e2e): give /explore tour-stage waits the 3D-load budget
- `397be49774` fix(surface): handle panorama/route-view Esc in capture phase
- `0289ef3c1e` fix(surface): panorama URL sync uses shallow replaceState, not goto
- (earlier in session) nav IA regroup, science-diagram blend restyle + colophon,
  orphan-test essay→science links, cross-worktree lock scope fix, 3 nav i18n keys

### The three e2e root causes (evidence-based, not guessed)

1. **mars-tier3 — panel dropped on panorama Esc-exit.** The detail `Panel.svelte`
   wires its OWN window `Escape`-to-close. A single Escape meant to leave the
   panorama both exited the panorama AND closed the panel, dropping the
   Stand-at-site button → "element(s) not found." **Fix** (`panorama-keys.ts`):
   handle Escape in the **capture phase** + `stopPropagation()` while a
   panorama / route-view is active, so it exits the immersive mode BEFORE the
   event reaches Panel's bubble-phase listener — order-independent of listener
   registration. No-op when nothing's active, so normal Escape-closes-panel is
   intact. `bindPanoramaEscape` is used twice in `SurfaceScene.svelte` (panorama
   + route-view); both get the capture-phase behavior. Verified locally 24/24.
   - NB: `0289ef3c` (replaceState instead of goto) was an EARLIER attempt at the
     same symptom and is a legitimate improvement (no per-drag full-nav), but it
     was NOT the fix — the Panel Escape conflict was. Both are on main.

2. **tour-stage-execution ×2 — too-tight 5s wait on the /explore 3D scene.** The
   `/explore` tour anchors mount only after the Three.js scene + missions load.
   The failed run's `error-context.md` showed the anchor **"resolved to visible"**
   but only after the 5s `waitForSelector` had already expired. **Fix**
   (`tour-stage-execution.spec.ts`): scene-ready waits → 30s (matching the
   `/earth` sibling's 10s hook wait and mars-tier3's 30s load budget), panel
   open/close waits → 15s. Element mounts correctly; the budget was the bug.

### Why the shard was red "suddenly"

Not a new regression. The desktop shard split (1-of-1 → 1-of-2 + 2-of-2, done
earlier to fit the runner budget) let the run RUN TO COMPLETION instead of being
cancelled by `concurrency: cancel-in-progress` on superseded pushes. The tour +
mars failures were pre-existing; the completing run simply reported them.

## Unpushed / pending your signal

- **`42bb38c36a` test(e2e): make perf-iconic-clicks thresholds warn, not gate.**
  `perf-explore-iconic-clicks.spec.ts` is a benchmark whose own header says
  "NOT A GATE... always passes structurally", but its trailing `expect.soft`
  budgets still failed the run under CI-runner variance (long-task count drifts
  with runner speed). Converted the three soft budgets to `console.warn` on
  breach — every number is still written to the JSON report + console summary,
  the run just no longer reddens on variance. Tightening into a real hard gate
  is the v0.8 per-click-perf follow-up. **Push triggers one more CI + docker-e2e
  cycle (~40 min); it's test-only so low risk.**

## Deferred (by design, tracked or noted)

- **#409** — redo remaining 15 /science diagrams in WIRED-blend after Higgsfield
  credits renew (2026-07-22). 48/63 done.
- **TV "big-box" nav hub** — Marko flagged wanting the Explore landing to be a
  rendered big-box hub (like the TV pattern) rather than a dropdown. We shipped
  "Solar System" as the Explore child label for now; the hub is future work,
  no issue filed yet.

## Gotchas worth carrying forward

- **`with-lock.mjs` is now per-worktree** (hashes the resolved cwd). A global
  lock was serializing independent git worktrees and could time out (→ fail) a
  push in one worktree behind a preflight in another. Fixed; don't reintroduce a
  name-only global lock.
- **Perf benchmark is warn-only now** — if you're chasing a real /explore
  per-click regression, read the WARN lines + the `test-results/perf-iconic-
  clicks/*.json` report; the test won't go red for you anymore.
- **Escape semantics on surface routes**: capture-phase handler in
  `panorama-keys.ts` intentionally swallows Escape when panorama/route-view is
  active. If you add another window Escape handler on those routes, mind the
  ordering — capture fires before bubble regardless of registration order.
