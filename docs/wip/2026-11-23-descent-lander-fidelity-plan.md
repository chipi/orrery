# /fly descent landers to launcher fidelity: plan (0.9.11, steps 2 and 3)

Status: draft for the operator's go. No model code is changed until approved.

## Why

Operator, 2026-11-23: "all our 3D landing modules are too primitive and simplified. The launchers
look amazing, and then what the landing looks like two-year-old children toys… Apollo 11 landing
things look awful. It's just a bunch of squares, and then even the rover is not that good."

## What is there now (measured, not assumed)

- /fly's descent builds its stack in `src/lib/three/descent-models.ts` (`BUILDERS`, 24 dedicated
  site ids plus per-body generics). The terminal `lander` part comes from `resolveLander`:
  - Moon: `buildMoonLanderModel` (`src/lib/moon-lander-models.ts`)
  - Mars: `buildMarsLanderModel` (`src/lib/mars-lander-models.ts`)
  - Venus, Jupiter, Titan, comet: hand-built one-offs in `descent-models.ts`
- Those Moon and Mars builders are the **Tier 0 surface silhouettes**: 11–26 meshes, 160–1,100
  triangles, flat colours. The launchers are 40–230 meshes and 5,000–27,000 triangles on the hero
  materials (`hero-materials.ts`) and the detail kit (`launcher-detail.ts`).
- 21 **Tier 1** models exist in `src/lib/hotspot-models/` (Apollo LM with ascent stage, LM
  extended with LRV, Luna 9, Luna sample return, Lunokhod, Chang'e lander and sample return,
  Vikram, SLIM, Beresheet, Viking, Pathfinder + Sojourner, MER, Curiosity, Perseverance, Phoenix,
  InSight, Mars 3, Zhurong, Schiaparelli, Beagle 2, Yutu). They are used by Worlds' close zoom
  (`register-*-hotspot-builders.ts`, keyed by `hotspot_model` in `static/data/surface-hotspots.json`)
  and **not** by /fly. Correction of my earlier inventory, which called them unused.
- Tier 1 is authored to the same envelope as Tier 0 (`apollo-lm.ts`: "Total height ≈ 1.4 world
  units, matches the Tier 0 silhouette envelope"), so a swap does not change the stack layout.
- The Apollo LM in descent has no ascent stage (`moon-lander-models.ts:127` builds the descent
  stage plus a box).
- `starship-demo` and `starship-mars-crew` have no descent builder and fall back to the generic
  Mars retro stack with an octahedron lander. `starship-flight-5` already uses
  `buildStarshipReturnStack`.

## Step 2: use what already exists (low risk)

1. **Tier 1 landers in descent.** In `resolveLander`, look up the site's Tier 1 model id (the
   same `hotspot_model` Worlds uses, through one small map from descent site id to model id) and
   build that instead of the Tier 0 silhouette. Fall back to Tier 0 when no Tier 1 model exists.
   Scale to the Tier 0 model's bounding height so the aeroshell, skycrane and legs still fit.
   Covers Apollo 11–17, Luna 9/16/17/21/24, Chang'e 3–6, Chandrayaan-3, SLIM, Beresheet, Viking,
   Pathfinder, Spirit, Opportunity, Curiosity, Perseverance, Phoenix, InSight, Mars 3, Zhurong,
   Schiaparelli.
2. **Hero materials on the Tier 1 models** where they use flat `MeshStandardMaterial`: gold foil
   becomes `heroGold`, silver and structure become `heroMetal`, panels become `heroSolar`. This
   also improves Worlds' close zoom, which uses the same builders.
3. **Starship Mars flights fly Starship.** `starship-demo` and `starship-mars-crew` get
   `buildStarshipReturnStack` (or a Mars variant: belly-flop entry, landing flip, three
   sea-level Raptors, legs) instead of the octahedron.
4. **The Apollo CSM in the undock beat** uses the showcase CSM (`flyCraft`) that the launch
   already uses, if the descent's orbiter is still the simple one (to check while implementing).

Tests: per builder swap, a test that the descent lander has at least N meshes and the Tier 1
proportions (LM: descent stage plus ascent stage, height ratio about 1.15). The scene tests and
`descent-models.test.ts` stay green.

Screenshots: before and after for Apollo 11, Curiosity, Perseverance, Chang'e 5, Viking 1 and
Starship Mars, on phone and desktop, at the landing moment and 5 s before.

## Step 3: rebuild the weakest to launcher level (bigger, per vehicle)

Ordered by how often the operator sees them and how far they are from the launchers:

1. **Sky crane with Curiosity and Perseverance**: the descent stage with its eight Mars landing
   engines, the bridle and tethers, the rover hanging under it with its wheels deployed.
2. **Aeroshells** (MSL/M2020 backshell with its cone and parachute cover, the heat-shield tiles,
   the Viking and Phoenix shells): the detail kit's ring frames, a stringer texture.
3. **Luna and Chang'e** descent stages: the tank spheres, the trusses, the engines.
4. **Venera** (Venus): the sphere, the landing ring, the airbrake disc.
5. Apollo LM: Tier 1 is a good base; add the descent engine bell, the RCS quads at full detail,
   the thermal-blanket texture.

Each rebuilt model gets a dimension test in the per-mission `BUILDERS` pattern (AGENTS.md:1107):
the real ratios from a cited source (as `apollo-lm.ts` cites NASA TN D-7700), a mesh-count floor,
and no geometry outside the aeroshell before heat-shield separation.

## Not covered by this plan

- Earth capsule returns (Mercury, Gemini, Soyuz, Dragon, Apollo CM): these already use the
  showcase capsule models (`buildCapsuleById`); not reviewed for fidelity here.
- Asteroid samplers, Huygens, the Galileo probe, Philae: not reviewed.
- About 28 showcase craft in `/fleet` that no /fly mission flies: a content question (which
  missions to add), not a model one.
- No GLB assets: RFC-017 OQ-6 chose procedural builders, and this plan stays procedural.

## Cost and risk

- Step 2: a day of work; a regression shows as a misplaced lander inside the aeroshell, which the
  screenshot set catches.
- Step 3: per vehicle, half a day to a day. Triangle budget: keep each lander under the launcher
  range (≤ 27,000 triangles) so the mobile frame rate does not drop.
- Rollback: each swap is one map entry; deleting it restores the Tier 0 model.
