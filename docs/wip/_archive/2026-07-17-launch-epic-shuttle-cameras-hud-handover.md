# Handover — Launch epic: Space Shuttle + cinematic cameras + telemetry HUD + ground (2026-07-17)

Session wrap for the `/fly` **launch/powered-ascent epic** (now **PRD-032 / RFC-034**, renumbered — see below). Everything below is on branch **`launch`**, pushed to **`origin/launch`**, **NOT on `main`**.

## Branch / git state

- **`launch` @ `9fa763c889`** → pushed to **`origin/launch`** (tracking set). Pre-push preflight passed.
- **47 ahead / 0 behind `origin/main`** (`origin/main` @ `7ee7f8870a`, untouched).
- Safety tag **`launch-backup-preRebase` @ `c838d92944`** = pre-rebase history (original PRD-031/RFC-033 numbering) if ever needed. Local only.
- Two session commits sit on top of the epic: `1b37e7f6…` (the big feature commit) + `9fa763c8…` (doc renumber). Everything is squash-free normal history.

## ⚠️ Doc renumbering — READ THIS FIRST

`main` **independently shipped PRD-031 / RFC-033 as the _Video & Live Feeds_ epic** (routes `/live`, `MediaPlayer`, `video-provenance`). The launch epic originally also used PRD-031/RFC-033 → hard collision on rebase.

**Resolved:** the launch epic is now **PRD-032** (`docs/prd/PRD-032.md`) + **RFC-034** (`docs/rfc/RFC-034.md`). All launch code comments + docs reference **RFC-034 / PRD-032**. The video epic keeps PRD-031 / RFC-033. The split was verified both ways (no launch file on the old numbers, no video file on the new). If you see stale "RFC-033" in an ascent file, it's a miss — fix it.

## What shipped this session (all working, preflight-green)

1. **Space Shuttle** (`space-shuttle-stack` flagship) — the crown jewel.
   - Procedural side-mount model in `src/lib/three/launcher-models.ts::buildSpaceShuttle` (orange ET + 2 white segmented SRBs + delta-wing orbiter, black nose/wing-underside, OMS pods, 3 SSMEs). Marko approved "good enough" after several iterations — proportions tuned against `fleet-galleries/{atlantis,columbia,enterprise}` reference photos (atlantis/01 head-on, atlantis/02 launch, enterprise/01 standalone).
   - Profile `static/data/launch-profiles/space-shuttle-stack.json`: SRB parallel-boost + SSME/ET core + Orbiter OMS. **Honest soft-insert** (MECO ~510 s / 7.3 km/s like the real vehicle; the 53 kN OMS can't circularise without PEG — same tier as atlas-v/ariane-5/h-iia).
   - **Two separations render** (Marko's explicit spec): orbiter-from-launcher (ET+SRB drop at MECO) + payload-from-orbiter at SECO.
   - **Galileo / Magellan / Ulysses** resolve to it via `fleet_refs` launcher. Verified end-to-end in `/fly` (launch → orbit → warp → cruise).

2. **Launch-site ground (RFC-034 S8)** — `src/lib/three/launch-ground.ts`. Real **EOX Sentinel-2 cloudless** crops (`static/images/launch-ground/*.jpg`, 12 complexes covering all 26 pads), tangent patch w/ radial rim-fade + altitude fade + emissive lift. Credited on `/credits` (source-logos `eox` + 12 image-provenance rows, CC-BY-4.0). NOTE: GIBS/Landsat was tried first and does NOT work (WELD dead, HLS single-date cloudy) — EOX cloudless is the source that delivers.

3. **Cinematic launch cameras** — ported the `/fly` flight technique (see `docs/guides/fly-cinematic-shot-language.md`): `src/lib/three/ascent-scene.ts` now has a **per-frame convergence layer** (`camS` + `K_POS/K_TGT/K_FOV`) — the camera eases toward each composed pose (smooth pan/dolly/zoom + soft blends between shots) while the look-at tracks the subject fast so **the vehicle never leaves frame**. `snapCamera()` for scrubs. In `ascent-cameras.ts`: replaced the useless downward `onboard_down` strap-cam with a side-tracking hero; chase/orbit/staging brought in hero-sized.

4. **Telemetry HUD** — new shared `src/lib/components/LaunchTelemetry.svelte` (propellant incl. **SRB reservoir**, altitude/velocity/dyn-pressure/aero-heat charts, T/W + chamber gauges, engines, GO/NO-GO). Now in **both** `/dev/ascent` and `/fly` `LaunchScene`. Dossier persists through the whole launch. Exposed booster propellant on `AscentState` (`boosterPropRemainingKg`, `boostersActive`).

5. **Launch debug in `/fly`** — `AscentCameraDebug` wired via `?debug=1` in `LaunchScene` (was dev-harness-only).

6. **Fixes**: booster body drops at first-stage burnout (`meco`) not strap-on jettison (also corrects Ariane/Soyuz); launch HUD shows the vehicle actually flown ("Atlas V 541", "Space Shuttle Atlantis…") not the flagship JSON's canonical variant (`loadLaunchProfile` overrides `name` with the mission vehicle string).

## Verified (test matrix, real /fly, end-to-end)

- **Apollo 11** (Saturn V → Moon), **Perseverance** (Atlas V → Mars), **Galileo** (Shuttle → Jupiter) — all launch → orbit → warp → correct cruise scene. Recordings were made (Desktop: `orrery-moon-mars-beyond.mp4`, gifs). Deep-link: `/fly?mission=<id>&launch=1` (auto-starts once the mission loads; `&debug=1` adds the camera-debug).

## Known gaps / next candidates

- **PEG guidance (#416)** — the banked work. Would let atlas-v / ariane-5 / h-iia / **space-shuttle-stack** reach *genuine* orbit instead of honest soft-insert. Currently `flagship-profiles.test.ts` excludes these from `GENUINE_ORBIT`.
- **Recordings start mid-ascent** — `/fly` LaunchScene auto-plays at 5×, so a screenshot burst can't catch the pad/liftoff frame. A play-speed or freeze hook on `LaunchScene` (dev harness has `__ascentSetT`) would fix clean recording.
- **Per-site ground orientation** — `orientationDeg: 0` for all 12 sites; coastlines land wherever north-up puts them. Fine, but could be calibrated.
- **Dedicated 3D models** for atlas-v / proton-k / titan-ii-glv (currently generic body). delta-ii / more absent-family launchers → GH #414/#416.
- **Data bug found (not fixed):** `static/images/fleet-galleries/space-shuttle-orbiter/01` is a **mislabeled ISS/Soyuz photo**, not the orbiter. Worth correcting.
- **`LaunchTelemetry` reservoir** shows liquid `stages` + the booster; fine, but boosters aren't in the per-stage engine cluster count beyond the "+N SRB" label.
- Dev harness `/dev/ascent` still has its own inline telemetry console (duplicate of `LaunchTelemetry`) — could be de-duped to use the shared component.

## Gotchas learned (save yourself the pain)

- **3D scene is built once at mount** — Svelte HMR updates the code but does NOT rebuild the running Three.js scene. Model/scene edits only show after a **full page reload** (Marko saw "identical" model for a while because of this).
- **Never run manual build/preflight steps concurrently** with a background preflight — they race on `.svelte-kit/output` (bogus "nodes/44.js not found"). One at a time.
- **preflight uses a lock** (`scripts/with-lock.mjs`) at **`$TMPDIR`/orrery-preflight-\<worktreeId\>.lock** — on macOS `$TMPDIR` is `/var/folders/…/T`, NOT `/tmp`. A killed/duplicate preflight leaves a stale lock dir; the pre-push hook then times out after 5 min. Clear it at the real `$TMPDIR`.
- **`unset NODE_OPTIONS`** before node/vitest/tsx (stale cmux preload → MODULE_NOT_FOUND).
- Prettier wasn't run during the session (only typecheck) → 15 files failed the pre-push prettier gate; `npx prettier --write` fixed them. Run prettier before trusting a push.

## Key files

- `src/lib/three/launcher-models.ts` (Shuttle model), `launch-ground.ts`
- `src/lib/three/ascent-scene.ts` (camera convergence layer, ground, separations)
- `src/lib/orbital/ascent-cameras.ts` (shots), `ascent-physics.ts` (booster fields, soft-insert), `launch-profile-registry.ts` (name override)
- `src/lib/components/LaunchScene.svelte` (/fly consumer), `LaunchTelemetry.svelte` (HUD), `AscentCameraDebug.svelte`
- `static/data/launch-profiles/space-shuttle-stack.json`, `static/images/launch-ground/`
- Docs: `docs/rfc/RFC-034.md`, `docs/prd/PRD-032.md`, `docs/guides/fly-cinematic-shot-language.md`
