# Session handover — 2026-07-14

*For the next agent. Written at the end of a long session that landed the AR-astronomy
layer + kicked off the /explore v2 epic. Read this, then the epic docs, then start.*

## TL;DR state

- **`origin/main` is current and clean** — everything from this session is pushed and
  landed (`main` == the work). `git fetch` + `git log origin/main` to see it.
- The **AR-astronomy layer shipped** this session (see below).
- The **/explore v2 "Known Universe" epic is kicked off** — docs written + on main, no
  code yet. **This is the next build.**
- No work in flight, no uncommitted code. You're starting fresh.

## What landed this session (all on main)

Built on top of the already-shipped AR epic (#150, which was on main before this session):

- **`$lib/astronomy`** — real-time sky-position engine (#393): JPL Keplerian planets,
  Meeus moon, ecliptic→equatorial→horizontal, GMST/LST. Unit-tested, coverage-counted.
- **`$lib/satellite`** — TLE parse + J2 propagation + topocentric look-angles +
  visible-pass predictor (#404). Now **WGS84-geodetic observer** (not spherical).
- **AR-astronomy modes** — sky-pointing (#393/#405), real-now Earth/Explore (#402/#403),
  stations orbiting real Earth + in the sky (#406), tabletop ISS/Tiangong (#407) +
  **assembly-on-placement replay** (#408).
- **Cross-platform sky (#393)** — `ar/sky-scene.ts` is substrate-agnostic via
  `ar/sky-view.ts`: ARKit (heading-aligned), WebXR (+compass correction,
  `ar/sky-orientation.ts`), and a **non-XR "magic window"** (camera feed +
  DeviceOrientation) for any mobile incl. iOS Safari. Gate: `skyAvailability` +
  `isMobileSkyCapable` in `src/lib/ar.ts`.
- **Daily TLE refresh (#404)** — `.github/workflows/refresh-tles.yml` +
  `scripts/fetch-station-tles.mjs` → `src/lib/satellite/station-tles.json` (now REAL
  Celestrak data, not the earlier synthetic placeholder).
- **Fixes** — index-tab layout (#3, centered on the left edge like /iss to match
  Marko's ask), two hardening passes' findings, a cold-lint eslint-disable fix.

## ⚠️ CRITICAL environment gotcha — the pre-push hook is NOT a hang

`git push` runs the **husky pre-push hook = `npm run preflight` (~2–3 min:
typecheck→lint→test→validate-data→build)** BEFORE the network push. It produces build
output and looks like a hang. **Do not kill it.** Last session burned ~an hour killing
pushes mid-hook (and the killed `git-remote-https` orphans then blocked the next attempt).

Push facts for this environment:
- HTTPS push over the configured `origin` works **via the gh token as an inline
  credential** (the osxkeychain GUI prompt hangs headless; the SSH agent is empty; the
  on-disk `~/.ssh/id_ed25519` is passphrase-protected). Working incantation:
  ```
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= \
    -c credential.helper='!f() { echo username=x-access-token; echo "password=$(gh auth token)"; }; f' \
    push --atomic --force-with-lease origin <branch> <branch>:main
  ```
  Run it **with `dangerouslyDisableSandbox: true`** and a generous timeout, and **let it
  finish** (hook + transport). `gh` is authed (`gh auth status` → chipi).
- If preflight was already run green manually in the same state, `--no-verify` skips the
  redundant hook re-run (only legitimate because the gate already passed — never to
  bypass a red gate).
- Branch protection on `main` is **admin-bypassed** by the push (expected; the "Bypassed
  rule violations" remote message is normal here). This is Marko's established FF-merge
  pattern: `origin <branch> <branch>:main`.

## THE NEXT WORK — /explore v2 "The Known Universe"

Extend `/explore` from the solar system to the known universe, **in place** (v1 solar
system untouched; v2 is the zoom-out that wraps it). Explore-only (no AR this epic).

**Read first (all on main):**
- **PRD-030** (`docs/prd/`) — product: vision, pillars, roadmap, the 6 locked decisions.
- **RFC-032** (`docs/rfc/`) — architecture: nested-context/scale-shell engine, scalable
  render (instanced points + impostors + `detect-gpu` budget), warp, lenses, data
  pipeline; per-slice technical contracts in §7.
- **UXS-014** (`docs/uxs/`) — interaction: boundary-crossing choreography, warp,
  breadcrumb, lens UX, discovery, responsive/a11y.
- **`docs/wip/2026-07-explore-v2-known-universe-kickoff.md`** — the epic pick-up doc.
- The Lavish visual map (`.lavish/explore-v2-known-universe.html`) — scratch, not committed.

**Locked decisions:** continuous zoom to the Stellar Neighborhood then warp beyond ·
~25–30 curated exoplanet heroes · v2.0 = slices 0–3 · culture layer = optional overlay ·
mobile = graceful budget tiers · name "The Known Universe."

**Slice 0 (start here):** zoom out of the solar system → Sun collapses to a dot → the
real HYG nearby-star field fades in (spectral-colored, budget-scaled, ≥30 fps mid-phone).
1. Data: fetch+normalize HYG → tiled JSON under `static/data/universe/stars/` (build
   script + provenance + schema; precompute B−V→RGB). Mirror the existing data pipeline.
2. Engine: `src/lib/universe/context-graph.ts` (Context + ContextGraph) +
   `src/lib/universe/point-field.ts` (instanced `THREE.Points` + spectral shader +
   magnitude LOD) + budget hook off `detect-gpu`.
3. Boundary: wire the SolarSystem→Neighborhood handoff into `/explore`, lazy dynamic-
   import so v1 is untouched.
4. **Visual anchor**: prototype the boundary-crossing moment (screenshot/mock) and gate
   on Marko's sign-off before polishing (his "visual anchor before UX commit" rule).
   `$lib/universe` is NOT coverage-excluded → write tests for the pure math from the start
   (functions≥82% gate).

**Branch:** Marko wants to "start fresh" — cut a new branch off main (suggest
`explore-v2`) for this epic. Confirm the branch name with him.

**Tracking:** the epic GH issue is **not yet created** (PRD-030/RFC-032 say `#TBD`).
Marko gates issue creation — ask before creating; draft the body for approval. Do NOT
create it unprompted (per-issue authorization rule).

## AR epic (#150) — what remains (device-only, NOT this epic)

- **iOS AR device session** (#206 wired in a prior session): build to the iPhone, verify
  the real ARKit session + the new astronomy modes on-device. See
  `docs/wip/2026-07-12-ar-device-testing-plan.md`.
- **Android AR device session**: Chrome-over-HTTPS on an ARCore device — verify tabletop
  globes + stations + the new cross-platform SKY (magic-window/WebXR). Same plan doc.
- **Compass calibration** (`AZIMUTH_CALIBRATION_RAD` in `ar/sky-orientation.ts`) is the
  one on-device unknown — sky may read rotated/mirrored; nudge that constant.

## Working agreements (also in CLAUDE.md / AGENTS.md / memory — don't re-derive)

- Never push without explicit approval. Rebase onto `origin/main` before every push.
  Red CI is requirements. Never commit without being asked (Marko commits at end of a
  block, or gives a checkpoint OK). Commit only your files (never `git add -A`).
- No PRs (feature branch → local main → push). No AI/Claude credit in commits.
- Visual work: browser + screenshot to iterate, Docker/e2e is the final gate only.
- Deliver full scope when asked for N items; don't silently defer. Global space
  programs, not NASA-only. Scientific honesty: real / model / artistic always labeled.
- Read TA.md (`docs/adr/TA.md`) before touching anything crossing one file.

## Loose ends

- `.lavish/explore-v2-known-universe.html` — scratch artifact, untracked, safe to ignore
  or delete.
- Verify no orphan `git-remote-https` / dev-server processes linger from the prior
  session before starting (`ps aux | grep -E 'git-remote|vite'`).
