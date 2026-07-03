# Handover — PWA upgrade-path diagnosis + icon rebrand (2026-07-01)

**Status:** mid-diagnosis. Icon + version work DONE (uncommitted). PWA "fix"
attempts REVERTED to baseline in the working tree. Harness built but its first
run hung before producing a verdict. Nothing committed, nothing pushed.

## The three things Marko asked for

1. **Icon rebrand (DONE, uncommitted).** The PWA installed icon + browser-tab
   favicon were the **NASA meatball** (`logos/nasa.svg`). Replaced with a new
   Orrery mark: an **eclipse-lit "O"** (hand-authored vector). Marko approved
   direction "n4", said *"good for 1st version, we might fine-tune later"*.
2. **Version.** Footer already renders **`v0.7`** (it strips `-wip` + patch from
   `__APP_VERSION__`). Marko wanted the internal string clean too → bumped
   `package.json` `0.7.0-wip` → **`0.7.0`**.
3. **PWA stuck-on-old-version (OPEN — this is the real work).** Users are
   stranded on **0.6.3**; it won't roll forward to 0.7.

## CRITICAL — do not trust the old diagnosis

Four PWA "fix" commits shipped earlier (they're on `main` + deployed) assumed the
cause was a **1.7 GB image precache failing SW install on iOS**. **Marko is not
convinced, and neither am I now:**

- **Fresh PWA install works** on his desktop AND phone and gets 0.7. So install /
  precache is NOT broken for new clients.
- The problem is narrower: **existing 0.6.3 clients don't upgrade.** That's an
  **upgrade-path / SW-handoff** problem, not (necessarily) a cache problem.

**Rule for next agent: CONFIRM the mechanism with the harness BEFORE changing any
SW code.** Do not re-apply the precache/update fixes on a hunch.

## What I reverted (working tree only — NOT committed, NOT pushed)

Restored these to baseline `6dc4f2d57` (the commit right before the 4 PWA "fix"
commits), so we diagnose from a known pre-fix state:

- `vite.config.ts` → baseline (autoUpdate, **image-heavy** `globPatterns`
  `**/*.{js,css,html,svg,png,jpg,webp,woff2,ico}`, skipWaiting+clientsClaim)
- `src/routes/+layout.svelte` → baseline SW registration
  (`navigator.serviceWorker.register('/sw.js', { scope: '/' })`, hardcoded)
- `package.json` → baseline build chain (no `check-precache-budget`)
- Deleted (working tree): `scripts/check-precache-budget.mjs`,
  `tests/e2e/pwa-update.spec.ts`

Then re-applied ON TOP of baseline: **version 0.7.0** + **favicon → favicon.svg**.

### The 4 reverted "fix" commits (still in git history, deployed)
- `78a0ad9b9` register SW under BASE path + controllerchange auto-reload + visibilitychange update check
- `9a0c1c262` shell-only precache — **ineffective in production** (see findings)
- `c6b0dc195` guardrails (precache-budget script, sw telemetry, e2e spec)
- `8e7c9ad7a` drop flaky SW-active e2e assertion

`git status` right now:
```
 M package.json                       (version 0.7.0)
 M src/routes/+layout.svelte          (baseline SW reg + favicon.svg link)
 M static/manifest.webmanifest        (icons → orrery set)
 M vite.config.ts                     (baseline PWA config)
 D scripts/check-precache-budget.mjs
 D tests/e2e/pwa-update.spec.ts
?? static/favicon.svg
?? static/icons/                      (orrery-192/512/maskable-512 .png)
?? treehouse.toml                     (pre-existing, ignore)
```

## Icon assets (created, in working tree)
- `static/favicon.svg` — hand-authored eclipse-O (dark tile, bold white ring with
  a light gradient limb = the "eclipse", a few faint stars). Scales cleanly to 16px.
- `static/icons/orrery-192.png`, `orrery-512.png`, `orrery-maskable-512.png`
- `manifest.webmanifest` icons array points at these; `<link rel="icon">` →
  `{base}/favicon.svg`. NASA logo removed from both.
- Generation history: Higgsfield. Rejected: single-bead-on-ring reads as a
  **piercing** (Marko's call). Winner "n4" = eclipse-O. Source drafts in
  `/tmp/orrery-icons*/`. `logos/nasa.svg` still exists on disk (only de-referenced).

## Key findings (evidence-backed)

- **Live deployed `sw.js` still precaches 1,816 JSON + 282 images** despite the
  "shell-only" globPatterns. Root cause: `@vite-pwa/sveltekit`'s
  `buildGlobPatterns` (`node_modules/@vite-pwa/sveltekit/dist/index.mjs:120`)
  **force-adds** `client/**/*.{js,css,ico,png,svg,webp,webmanifest}` +
  `prerendered/**/*.{html,json}` unless your patterns are `client/`- /
  `prerendered/`-prefixed. The fix that *would* work (if precache is ever
  confirmed relevant): use `client/**/*.{js,css,woff2,svg,ico}` +
  `prerendered/**/*.html`. **But probably not the root cause** (fresh install works).
- **v0.6.3 has NO base-path support** (no `VITE_BASE`) — always root-served,
  SW at `/sw.js`. It used the standard `useRegisterSW` (virtual:pwa-register).
  So stuck 0.6.3 clients were served from **root (the VPS)**, not `/orrery/`.
  The `/orrery/` GH-Pages base + SW-registration rework all came AFTER 0.6.3.
- The `useRegisterSW` → manual `/sw.js` switch **predates** the 4 fix commits
  (baseline already has manual registration). Going "all the way back" to the
  `useRegisterSW` flow is a bigger revert than what I did — ask Marko if wanted.

## The harness (built, in /tmp/pwa-harness/ — NOT in repo yet)

Proves the real upgrade path: serve OLD build, install its SW in headless
Chromium, flip a symlink to the NEW build (= a deploy at the same origin),
reload-loop, report UPGRADED vs STUCK with per-reload SW-state trace.

- `/tmp/pwa-harness/harness.mjs` — the script (Node http server + Playwright)
- `/tmp/pwa-harness/v063/` — `git worktree` at tag `v0.6.3`, built → `build/`
  (real 0.6.3 SW, precaches 1,386 images). This is the **OLD**.
- `/tmp/pwa-harness/head/` — `git worktree` at HEAD, built → `build/`
  (the currently-deployed SW, precaches 282 images). This is the **NEW**.
- `node_modules` symlinked into `/tmp/pwa-harness/` and `.../head/` (skip npm ci).

Re-run:
```bash
cd /tmp/pwa-harness
OLD_DIR=/tmp/pwa-harness/v063/build NEW_DIR=/tmp/pwa-harness/head/build PORT=4321 \
  node harness.mjs
```

**First run HUNG** after printing only `serving swappable root at ...` — never
reached a verdict. Suspect: `page.goto('/', {waitUntil:'load'})` never firing
(some 0.6.3 resource never "loads"), or `waitController` stalling. **Next agent:
debug this** — try `waitUntil:'domcontentloaded'` + a `page.goto` timeout, run
`headless:false` to watch, and/or add step logging before/after goto. The
server + Chromium launch themselves work (it got past those).

Also consider a **`/orrery/` base-path variant** — the real GH-Pages topology,
which the root-only harness doesn't reproduce.

## Decisions locked (for when we reach the fix)
- **Update UX** = *notify + auto-apply shortly* (toast "Updating to v0.7 ·
  auto-reloads in 5s"), per Marko's pick.
- **Version** → `0.7.0`. **Icon** → eclipse-O (approved, may fine-tune).

## Next steps (in order)
1. **Fix + run the harness → get the verdict.** Does `0.6.3 → HEAD` upgrade or
   stick on desktop Chromium?
   - If it **UPGRADES**: desktop mechanism is fine → the stuck bug is iOS-specific
     or an origin/topology issue (VPS root vs GH-Pages `/orrery/`, or clients on a
     different origin than where they now check). Investigate that. Confirms Marko's doubt.
   - If it **STICKS**: read the SW-state trace to see where (new SW `waiting`
     forever? install `redundant`? controller URL wrong?), then design the fix.
2. Only then apply the confirmed fix (task #5/C, and #4/B *only if* implicated).
3. Consider promoting the harness to a **CI deploy gate** (task #8) — decide the
   "old" baseline source (live gh-pages vs last tag vs HEAD~1). Move harness into
   `scripts/` + a tracking GH issue + short design note.
4. `npm run preflight` before anything pushable. **NO push without Marko's
   explicit approval.** (Note: reverting to baseline re-introduces image precache
   + drops the guardrail test — that's intended for diagnosis, not for shipping.)

## Session gotchas
- **Native `Edit` tool is broken this session** (lean-ctx shadowing — Read doesn't
  register). Use `node`/`python`/`sed` via Bash for edits.
- Backgrounding with `( ... ) &` inside a `run_in_background` Bash double-forks;
  the launcher returns exit 0 while the real work continues — check the log file.
- Don't kill Marko's dev server (:5273/:5373). Harness used :4321.
- Marko's cadence: commit only when he says; **never push without explicit "go"**;
  image changes need his per-image approval (n4 already approved).

## Task list (TaskCreate IDs)
1 done · 2 done · 3 done · 4 pending (blocked on harness) · 5 pending (blocked on
harness) · 6 pending · **7 in_progress (harness — debug the hang)** · 8 pending ·
9 pending.
