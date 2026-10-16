# Handover — mobile/0.8 epic merged + deployed to prod (2026-07-11)

Session close-out. The `mobile` epic branch (0.7 → 0.8-wip) is **merged to `main`
(`0ca83df020`) and deployed to the prod VPS** over Tailscale. All required CI
gates green (CI, CodeQL, mobile-e2e, docker-e2e). This doc is the pick-up point
for the next session.

## What shipped this cycle

- **Capacitor mobile wrapper (epic #149 foundation)** — iOS/Android scaffolds,
  `build:mobile` stream-heavy partition (~47 MB on-device), plugins
  (splash/status-bar/browser/share/app/haptics), `orrery://` deep-links, WebGL
  context-loss reload recovery, icons/splash. The app builds + streams; it is
  NOT yet in the stores.
- **RFC-031 a11y / TV** — roving-toolbar nav, spatial focus, global command
  palette, TV 10-foot overscan layer, keyboard + axe e2e, WCAG 2.1 AA statement.
- **Image pipeline (RFC-030/ADR-080)** — WebP size ladder (1280/2048/3072) +
  `srcset` + git-LFS `masters/` + `image-ladder.json`; i18n source relocated to
  `i18n-src/`; `assetUrl()` origin spine.
- **2 dogfood missions** — artemis4 (Moon) + hera (Didymos), full content +
  images + i18n; drove the mission/fleet/flyby/site-story runbooks.
- **Trajectory thumbnails (#390)** — Sun/comet/asteroid renderer + fail-closed
  validate-data gate.
- **Nav drawer redesign (2026-07-11)** — on narrow phones (≤500px) the locale
  picker + high-contrast toggle move into the hamburger drawer (kept in the bar
  on landscape); all bar buttons stay 44px. See `Nav.svelte` §`.drawer-controls`.
- **Prod delivery** — pivoted off GH Pages to the self-hosted VPS
  (`deploy-prod.yml`, `workflow_dispatch`, tailnet-only phase 1).

## Issues closed this session (18)

Deploy/epic work: #390 #383 #379 #378 #377 #221 #382 #385 #386 #276(dup) #373.
Epic #149 foundation: #189 #190 #192 #193 #196 #197. Achieved-differently: #275.

## Remaining OPEN — grouped by what's needed

**Ready to do now (no external deps):**
- **#202** — v0.8 release gate. e2e is green; this just needs the **v0.8 tag**
  cut (Marko smoke-tests first, then tag — see `feedback_release_workflow`).
- **#194** — Android back-gesture handling. Small self-contained code slice
  (`App.addListener('backButton', …)`), not yet in the code.

**Needs Marko (accounts / manual store ops):**
- **#200 / #201** — iOS: Capacitor sync → Xcode archive → TestFlight → App Store
  (needs Apple Developer account; iOS-first per ADR-078).
- **#198 / #199** — Android: Internal Testing → Play Console → Production.

**Deferred / future:**
- **#195** — WebGL context-loss per-scene reinit (reload path shipped; 7 per-scene
  reinits deferred).
- **#375** — Android TV (Leanback + D-pad camera control); sequenced after phones.
- **#274** — virtualize long lists (/missions/launches, /fleet, /library,
  /credits) — none virtualize today, all render every row.
- **#389** — image alt-text quality: **705 of 2086** entries are still raw
  `File:…jpg` filenames (only the localization half shipped).
- **#384** — 187 byte-identical image dupes (content-quality triage).
- **#381 / #387 / #388** — prod public Caddy edge, VPS/CDN caching headers,
  visual-baseline expansion.

## Gotchas learned (persisted as memories — read before repeating the pain)

- `feedback_run_docker_e2e_locally` — **browser-first, Docker-last** for visual
  work (a ~6h Docker-per-tweak loop; full rule now in AGENTS.md §"Iterating on
  UI/layout/visual changes").
- `feedback_git_reset_after_failed_checkout_pipe` — worktree merge: don't
  `checkout main` (it's checked out elsewhere); merge via `git push origin
  branch:main` (ff), never `reset --hard` after an unverified checkout.
- Visual baselines are **amd64** — regen via the `Regenerate visual snapshots`
  GH workflow (arm64 local drifts >2%); or adopt CI's `-actual.png`.
- npm lockfile can miss Linux-resolved wasm optionals → regen in node:20 Linux.
- `npm run test` must build the i18n bundle first (gitignored artifact) — wired
  into the `test` script now.

## How to resume

`main` is green + on prod (tailnet). Local docker + dev servers are down; working
tree clean. Pick from "Ready to do now" (tag v0.8 for #202, or #194 back-gesture)
or take Marko's direction. Prod is at `0ca83df020`; the launches bot has since
pushed launches-only refreshes — a redeploy picks those up but isn't urgent.
