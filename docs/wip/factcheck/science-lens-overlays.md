# Science-Lens overlay microcopy fact-check (2026-08-05)

Scope: every `science_layer_*_desc` string in `messages/en-US.json` — the 33
one-line descriptions shown in `ScienceLayersPanel.svelte` for the toggleable
physics overlays (`src/lib/science-layers.ts`). These are the highest
claim-density surface in the app and were **outside** the 2026-07-14 sweep, which
covered the science *encyclopedia articles* (the "130 science overlays" in
`INDEX.md` = the section tree), not the Lens layer microcopy.

Severity: 🔴 wrong physics/fact · 🟠 claim > evidence / missing caveat · 🟡 needs
source/softening · 🔵 nit. Reviewer: skeptical read against each layer's actual
renderer.

## Fixed in this pass (3)

- 🔴 **`science_layer_centripetal_desc`** — was *"Inward acceleration arrows
  balancing gravity (F = ma)."* Framed a circular orbit as a force *equilibrium*
  (the centrifugal-force fallacy in disguise): in orbit gravity **is** the
  centripetal force, it does not *balance* a separate one. The renderer already
  knew this — `fly-leo-coast-scene.ts:167-169, 304-308` draws the gravity and
  centripetal arrows **coinciding** (both radially inward) precisely to show
  "gravity IS the centripetal force." Only the text contradicted the picture.
  → *"Inward acceleration that bends the path into an orbit — gravity itself
  provides it (a = v²/r), so it points the same way as the gravity arrow."*
  Also tightened the code comment ("balanced by"→"plus", "show the balance"→
  "show they coincide") so the dev-facing model matches.

- 🟠 **`science_layer_soi_desc`** — was *"Translucent rings showing where each
  body's gravity dominates."* Implied a hard physical boundary, the exact SOI
  misconception. Its sibling `hill_sphere_desc` already carries an approximation
  caveat; SOI did not. The encyclopedia article `transfers/patched-conics.json`
  explains it correctly (a patched-conics working compromise). Aligned the
  microcopy to both. → *"Translucent rings marking where each body's gravity
  dominates — an approximation for planning trajectories, not a physical wall."*

- 🔵 **`science_layer_apsides_desc`** — was *"Perihelion / aphelion markers + the
  live ν = 42° angle."* Self-contradictory: a hardcoded "42°" presented as
  "live," while the true-anomaly readout is genuinely recomputed per frame
  (`fly-updaters.ts` `apsidesRecompute`). → *"Perihelion / aphelion markers +
  the live true-anomaly (ν) angle."*

All three were re-translated across the 13 non-en-US locales (hand-translated —
no Anthropic key present in this environment to run `translate-v07-ui.mjs`) and
`i18n:compile`d. See "Translation confidence" below.

## Checked — no change needed (30)

Verified against each layer's renderer / known values; honest as written.

- **Well-caveated already (model for the rest):** `hill_sphere_desc` ("Stylised
  radius (real Hill spheres can exceed the planet's orbit)"), `galaxies_desc`
  ("sky-overlay only, not true scale"), `magnetosphere_desc` ("Stylised … mag-tail
  extends past Saturn's orbit in reality"), `gravity_desc` ("log-scaled so all
  are visible").
- **Accurate physics/figures:** `atmosphere_desc` (Kármán line / ~120 km Mars),
  `tidal_lock_desc`, `sub_earth_desc` (libration 59%), `far_side_desc` (Luna 3,
  1959), `tides_desc` (twin bulges, two highs/day), `hydrosphere_desc` (71%),
  `ozone_desc` (ClO/BrO catalysis), `dead_dynamo_desc` (fossil crustal field),
  `polar_caps_desc` (seasonal CO₂ over water ice), `mars_moons_desc` (Phobos
  west-rise, ~50 Myr breakup), `axial_tilt_desc`, `mag_north_desc` (declination),
  `sub_solar_desc`, `lagrange_points_desc` (JWST@L2, SOHO@L1),
  `moons_desc`, `velocity_desc`, `thrust_desc`, `drag_desc`,
  `ascent_losses_desc`, `coast_desc`, `conics_desc`, `microgravity_desc`,
  `climate_desc`, `planet_stats_desc`, `hover_desc`.

## Consistency sweep (repeats of the fixed issues elsewhere)

Searched `static/data/science`, `i18n-src`, `src/lib`, `src/routes` for the same
two error patterns. Findings:

- **Centripetal/centrifugal elsewhere is frame-correct, NOT the same error:**
  `orbits/lagrange-points.json` ("pull … balance the centripetal requirement"),
  `planets/planetary-stats.json` ("centrifugal forces flatten" Jupiter),
  `orbit-regimes-moon/L2.json` ("Earth, Moon, and centrifugal forces balance")
  are all rotating-frame statements, where centrifugal is a legitimate
  pseudo-force and L-points are genuine equilibria. Left unchanged (correct).
- **SOI-as-wall not repeated:** every other "sphere of influence" / "gravity
  dominates" usage (`transfers/patched-conics.json`, `scales-time/frames.json`,
  `propulsion/v-infinity.json`) is either explicitly an approximation or a
  frame-choice statement. No other hard-boundary claim.

## Translation confidence (hand-translated, no API key)

High confidence: de, es, fr, it, nl, pt-BR, ru, ja, ko, zh-CN (standard terms:
centripetal acceleration, sphere of influence, perihelion/aphelion, true
anomaly). **Spot-check recommended:** ar, hi, sr-Cyrl. The Arabic `soi_desc`
also corrects a pre-existing MT error ("جثة" = corpse → "جِرم" = celestial body).
Re-run `node scripts/translate-v07-ui.mjs --keys=science_layer_centripetal_desc,science_layer_soi_desc,science_layer_apsides_desc`
when a key is available to replace the hand set with the vetted pipeline output.

## Not verified

- The 30 "no change" strings were checked for correctness of the stated claim,
  not for whether each layer's *renderer* draws exactly what the text says (e.g.
  that `moons_desc`'s Galilean/Titan lists match the actual meshes) — that is a
  viz-vs-text audit, separate from this factual pass.
- Labels (`science_layer_*_label`, 33 keys) scanned but not deeply reviewed;
  they are short noun phrases with no factual claims.
