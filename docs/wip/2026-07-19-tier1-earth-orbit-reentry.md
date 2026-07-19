# Tier-1 Earth-orbit capsules — pad → orbit-coast → re-entry (handover)

**Status:** built + browser-verified, UNCOMMITTED (awaiting review). 2026-07-19.
**Plan:** `~/.claude/plans/enumerated-doodling-ember.md` (approved). RFC-034 §13. Tracking: GH #419 (parent epic #412).

## What this adds

`/fly` already modelled ascent (launch) and descent (planetary EDL). This makes
the ~31 Earth-orbit crewed capsules — previously `flight:false` catalog entries —
fully flyable **pad → orbit-coast → re-entry → recovery**, as one continuous
timeline. It's the MVP template for the later tiers (lunar-return, sample-return
SRCs, X-37B).

## The three new mechanics

1. **Earth is now a descent body.** `DescentBody` gained `'earth'` + physics
   constants (`descent-physics-constants.ts`), an Earth re-entry sky
   (`descent-scene.ts`), and a new `EARTH_CAPSULE_REENTRY` EDL archetype
   (ballistic entry → drogue → mains → splashdown/ground) in
   `descent-profile-registry.ts`. One archetype covers orbital + suborbital.

2. **The orbit-coast act** (`fly-leo-coast-scene.ts` + `CoastScene.svelte`) — an
   Earth-centred km-unit scene showing the capsule looping the planet on its orbit
   ring with a building ground-track, under a **cinematic shot schedule**
   (establish → track → limb → ground-track, lerped for smooth crane moves) per
   `fly-cinematic-shot-language.md`, matching the launch + re-entry acts. **Hybrid loop rule (Marko's decision):**
   render `min(realRevs, LOOP_CAP=3)` loops — 1/2/3-orbit missions show exactly
   that many, marathons (Gemini-7 = 206, Skylab-4 = 1214) render ~3 representative
   loops while the **REV n/N + MET/date counters carry the real scale**.

3. **Unified master scrubber.** The coast is the "cruise" act of `/fly`'s ONE
   pad→orbit→re-entry timeline. `CoastScene` is `externalClock`-driven by the
   master clock; the single scrubber floats over all overlays and drags
   continuously through launch → coast → descent (verified: u=0.05 LAUNCH,
   0.5 COAST REV 2/3, 0.96 DESCENT). `masterTimeline` uses the coast duration as
   its cruise; `onMasterScrub` routes the cruise band to the coast for Earth-orbit
   missions; the rAF advances `coastMetDays` and crosses the deorbit seam.

## Coverage (all 31 fly, 8 capsule families)

`friendship-7`, `vostok-1`, `apollo7` + the 28-mission batch. Capsule models in
`capsule-models.ts` — **8 families → 6 distinct meshes**: Voskhod reuses the
Vostok sphere and Shenzhou is a scaled Soyuz descent module (both historically
correct — Voskhod *is* a modified Vostok, Shenzhou *is* Soyuz-derived), so
`/dev/models` + colophon carry 6 cards. Resolved per-mission via `earth-orbit-registry.ts`.
Data: `static/data/descent-profiles/*.json` (31 Earth profiles, FPA=4 +
mass-scaled chute Cd·A template) + coast descriptors in the registry.

**Launchers (E7):** added `mercury-redstone` (suborbital), `voskhod-11a57`,
`soyuz`, `long-march-2f` profiles + BUILDERS entries + soyuz fleet-refs. All 31
resolve a launcher.

**Colophon (E4):** 6 capsule cards in `/dev/models` + `build-original-work.mjs`
(`models3d` → 112) + captured thumbnails.

**Honest outcomes (E8, partial):** the recovery card is outcome-aware —
SPLASHDOWN (US) / TOUCHDOWN (Soviet/China ground) / **IMPACT** (crash) — with
honest captions for `soyuz-1` (parachute failure, Komarov) and `soyuz-11`
(depressurization). soyuz-1 flies to `touchdownSuccess:false`.

## Verification

- Unit: `descent-physics` 17/17, `descent-profiles` 150/150 (all 31 fly to their
  honest outcome incl. soyuz-1 crash + 2 suborbital hops), `flagship-profiles`
  34/34 (new launchers reach orbit), `descent-profile-registry` (75 mission set).
  `npm run typecheck` 0 errors.
- Browser: friendship-7 full pad→orbit→splashdown; unified scrubber drags across
  all three acts; gemini4/inspiration4/vostok-2 re-entries render their capsules;
  freedom-7 + shenzhou-1 launch; hybrid rule (1 loop vs 206 counter).

## Polish shipped (2026-07-19, second pass)

- **Descent-playback compression** — Earth re-entries play in a fixed ~30 s
  wall-time (scaled by the speed pills) in the master rAF, so they're watchable
  and reach the recovery card (planetary EDL keeps its real-time ×). The 1-DOF
  FPA=4 profile stays (realistic ~9.6 g; steeper spikes peak-g to 24→5000 g, so
  the long path is the honest physics trade — verified via a sweep).
- **Recovery card is outcome-aware** — SPLASHDOWN (US) / TOUCHDOWN (Soviet/China
  ground) / **IMPACT** (crash), with honest captions (soyuz-1 Komarov, soyuz-11).
  Verified: friendship-7 → SPLASHDOWN, soyuz-1 → IMPACT + caption.
- **In-scene re-entry HUD** — BLACKOUT (plasma, pulsing) → DROGUE → MAIN lamps in
  `DescentScene` for Earth (planetary keeps CHUTE/RETRO). Honest but **brief**
  windows — the 1-DOF trajectory spends most of its time in a slow glide, so the
  dramatic entry gets little playback time (see cinematography gap below).
- **E9 science-lens** — Earth re-entry inherits the shared `DescentScene`
  `DESCENT_FORCE_LAYER_ENTRIES → setForceVisible` wiring (drag-dominated capsule).
- **Compressive scrubber-band width** — `coastAscentFrac` shrinks with
  log(coast hours) so the coast band widens with duration (0.708 for 1 orbit →
  0.799 for 84 days).

## Gaps closed (2026-07-19, third pass)

- **HUD MET clock** — Earth re-entry now displays a clock scaled to a nominal
  ~14 min entry→splashdown (`DescentScene.clockT`), not the 1-DOF model's ~109 min
  path time; the dossier "DESCENT Ns" scales to match. The physics (peak-g,
  sequence, outcome) is unchanged. Verified: E+01:32 → E+14:00.
- **Suborbital coast** — freedom-7/liberty-bell-7 verified in-flight; the coast
  HUD is now suborbital-aware (**SUBORBITAL** / APOGEE / SPLASHDOWN IN, no REV/ORBIT).
- **Orbital data** — reviewed: every orbital mission has a consistent ~90–98 min
  LEO period, and the headline params (revs/duration/inclination) match the real
  missions. Precise apo/peri + landing coords remain approximate (best-knowledge,
  not per-value citation-sourced — no citations fabricated).
- **Tracking issue** — GH #419 filed under parent epic #412.

## NOT done / the one remaining gap (the deep one)

- **Descent cinematography / 2-DOF model.** The 1-DOF shallow-corridor model
  can't give realistic *duration* and *peak-g* together (a physics sweep showed
  steeper FPA spikes peak-g to 24 → 5728 g), so re-entries have a long slow-glide
  shape and the uniform playback compression makes the in-scene BLACKOUT/DROGUE/
  MAIN lamps blink. The proper fix is a **2-DOF descent model** (or an
  event-weighted playback that lingers on entry + chutes). Tracked in #419.

## Debug coverage (like ascent + /fly)

- **`?debug=1` FLY tab** shows a **TIER-1 EARTH-ORBIT** block (phase · capsule ·
  orbit · coast frac/REV/rendered-loops · scrubber u/ascentFrac/coastBand ·
  re-entry peak-g/TD/outcome) — the `flyDebugContent` snippet in `routes/fly/+page.svelte`,
  gated on `earthCoast` (doesn't leak into interplanetary/cislunar missions).
- **`window.__flyReentryDebug()`** — DEV-only diagnostic hook (mirror of
  `__flyCislunarDebug`): returns `{phase, earthCoast, coastFrac, coastMetDays,
  liveRev, renderedLoops, masterU, coastAscentFrac, descent{peakG,touchdownMs,
  success}, recovery}`. Use it for chrome-devtools + e2e instead of scraping the DOM.

## Key files

Physics: `descent-physics{,-constants}.ts`, `descent-profile-registry.ts`,
`descent-scene.ts`, `descent-models.ts`. Coast: `fly-leo-coast-scene.ts`,
`CoastScene.svelte`, `earth-orbit-registry.ts`. Models: `capsule-models.ts`.
Wiring: `routes/fly/+page.svelte` (search `earthCoast`, `showCoast`,
`coastMetDays`, `recoveryOutcome`). Data: `descent-profiles/*.json`,
`launch-profiles/{mercury-redstone,voskhod-11a57,soyuz,long-march-2f}.json`.
Dev harness: `/dev/leo-coast?revs=N`.
