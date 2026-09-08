# /lab formula → learn-more link map (2026-09-07)

Closes the two linkages the operator asked for on the Physics Lab cards:

1. **Internal** — every formula card deep-links to the matching **/science encyclopedia**
   article via `FormulaDef.citationKey` (mechanism already existed; was 2/64 populated).
2. **External** — every formula card carries a curated, first-principles **"Learn more"**
   link via the new `FormulaDef.learnMore = { url, source }` field.

Both render in a single **"Learn more" row at the card bottom** (`Card.svelte`): teal for
the internal encyclopedia link, gold for the external (leaves-Orrery colour discipline).
The old gold **"?"** header affordance was absorbed into this row.

## Coverage
- Formulas: **64**
- Internal citations: **52** valid /science slugs (12 honest blanks — mostly the
  ephemeris / sky-position formulas with no matching article yet).
- External links: **64/64**, source split → {"nasa-glenn":6,"hyperphysics":8,"wikipedia":50}.

## Verification (curation time, 2026-09-07)
- Every `citationKey` asserted to resolve to a real `static/data/science/<slug>.json`
  (curation script + the new guard test `src/lib/physics/registry/citations.test.ts`).
- Every external URL curl-swept to **HTTP 200** (Mozilla UA, follow-redirects).
- Source strategy (operator: curated best-per-formula): HyperPhysics for pure
  mechanics/orbits/energy, NASA Glenn Beginner's Guide for rocketry/thrust, Wikipedia as
  the universal fallback.

## The map

| formula | citationKey (/science) | ext source | external URL |
|---|---|---|---|
| `tsiolkovsky` | `propulsion/tsiolkovsky` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/rocket/rktpow.html |
| `newton-second-law` | — | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/newt.html |
| `weight` | — | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/mass.html |
| `momentum` | — | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/mom.html |
| `twr` | `propulsion/thrust-and-twr` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/airplane/fwrat.html |
| `free-fall` | — | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/traj.html |
| `projectile` | — | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/traj.html |
| `delta-v-margin` | `propulsion/dv-budget` | wikipedia | https://en.wikipedia.org/wiki/Delta-v_budget |
| `orbital-velocity` | `orbits/keplerian-orbit` | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/orbv.html |
| `vis-viva` | `orbits/vis-viva` | wikipedia | https://en.wikipedia.org/wiki/Vis-viva_equation |
| `hohmann-transfer` | `transfers/hohmann-transfer` | wikipedia | https://en.wikipedia.org/wiki/Hohmann_transfer_orbit |
| `launch-site` | `mission-phases/launch` | wikipedia | https://en.wikipedia.org/wiki/Spaceport |
| `reach-orbit-verdict` | `mission-phases/orbit-insertion` | wikipedia | https://en.wikipedia.org/wiki/Orbital_spaceflight |
| `descent-burn` | `mission-phases/propulsive-landing` | wikipedia | https://en.wikipedia.org/wiki/Powered_descent |
| `interplanetary-transfer` | `transfers/patched-conics` | wikipedia | https://en.wikipedia.org/wiki/Interplanetary_Transport_Network |
| `launch-window` | `porkchop/what-is-a-porkchop` | wikipedia | https://en.wikipedia.org/wiki/Launch_window |
| `porkchop` | `porkchop/what-is-a-porkchop` | wikipedia | https://en.wikipedia.org/wiki/Porkchop_plot |
| `cislunar-transfer` | `orbits/cislunar-orbits` | wikipedia | https://en.wikipedia.org/wiki/Trans-lunar_injection |
| `ascent-to-orbit` | `mission-phases/gravity-turn` | wikipedia | https://en.wikipedia.org/wiki/Gravity_turn |
| `ascent-guidance` | `mission-phases/ascent-guidance` | wikipedia | https://en.wikipedia.org/wiki/Guidance,_navigation,_and_control |
| `powered-descent` | `mission-phases/propulsive-landing` | wikipedia | https://en.wikipedia.org/wiki/Powered_descent |
| `entry-steering` | `mission-phases/lifting-entry` | wikipedia | https://en.wikipedia.org/wiki/Atmospheric_entry |
| `entry-range-control` | `mission-phases/entry-footprint` | wikipedia | https://en.wikipedia.org/wiki/Atmospheric_entry |
| `terminal-velocity` | `mission-phases/terminal-velocity` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/airplane/termv.html |
| `soft-landing-check` | `mission-phases/propulsive-landing` | wikipedia | https://en.wikipedia.org/wiki/Soft_landing_(aeronautics) |
| `airbags-check` | `mission-phases/edl` | wikipedia | https://en.wikipedia.org/wiki/Mars_Pathfinder |
| `engine-performance` | `propulsion/specific-impulse` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/rocket/specimp.html |
| `micro-g-surface` | `orbits/hill-sphere` | wikipedia | https://en.wikipedia.org/wiki/Surface_gravity |
| `touchdown-bounce` | — | wikipedia | https://en.wikipedia.org/wiki/Coefficient_of_restitution |
| `retro-descent` | `mission-phases/propulsive-landing` | wikipedia | https://en.wikipedia.org/wiki/Retrorocket |
| `dv-to-orbit` | `propulsion/dv-budget` | wikipedia | https://en.wikipedia.org/wiki/Delta-v_budget |
| `deorbit-burn` | `mission-phases/deorbit-corridor` | wikipedia | https://en.wikipedia.org/wiki/Atmospheric_entry |
| `entry-heating` | `mission-phases/entry-heating` | wikipedia | https://en.wikipedia.org/wiki/Atmospheric_entry#Entry_heating |
| `entry-corridor` | `mission-phases/deorbit-corridor` | wikipedia | https://en.wikipedia.org/wiki/Atmospheric_entry |
| `rocket-sizing` | `propulsion/rocket-stages` | wikipedia | https://en.wikipedia.org/wiki/Multistage_rocket |
| `liftoff-thrust` | `propulsion/thrust-and-twr` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/rocket/rktthsum.html |
| `engine-count` | `propulsion/engine-clustering` | wikipedia | https://en.wikipedia.org/wiki/Rocket_engine |
| `staging` | `propulsion/rocket-stages` | nasa-glenn | https://www.grc.nasa.gov/www/k-12/rocket/rktstage.html |
| `booster-count` | `propulsion/engine-clustering` | wikipedia | https://en.wikipedia.org/wiki/Booster_(rocketry) |
| `cluster-thrust` | `propulsion/engine-clustering` | wikipedia | https://en.wikipedia.org/wiki/Rocket_engine |
| `solar-escape-velocity` | `orbits/escape-velocity` | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/vesc.html |
| `heliocentric-escape-dv` | `propulsion/c3` | wikipedia | https://en.wikipedia.org/wiki/Characteristic_energy |
| `oberth-departure-dv` | `propulsion/oberth-effect` | wikipedia | https://en.wikipedia.org/wiki/Oberth_effect |
| `gravity-assist` | `transfers/gravity-assist` | wikipedia | https://en.wikipedia.org/wiki/Gravity_assist |
| `escape-verdict` | `orbits/escape-velocity` | hyperphysics | http://hyperphysics.phy-astr.gsu.edu/hbase/vesc.html |
| `assist-chain` | `transfers/gravity-assist` | wikipedia | https://en.wikipedia.org/wiki/Gravity_assist |
| `moon-phase` | — | wikipedia | https://en.wikipedia.org/wiki/Lunar_phase |
| `moon-distance` | — | wikipedia | https://en.wikipedia.org/wiki/Lunar_distance_(astronomy) |
| `eclipse-seasons` | — | wikipedia | https://en.wikipedia.org/wiki/Eclipse_season |
| `moon-altitude` | — | wikipedia | https://en.wikipedia.org/wiki/Horizontal_coordinate_system |
| `orbit-regime` | `orbits/orbit-regimes` | wikipedia | https://en.wikipedia.org/wiki/List_of_orbits |
| `geostationary-altitude` | `orbits/special-orbits` | wikipedia | https://en.wikipedia.org/wiki/Geostationary_orbit |
| `signal-latency` | `scales-time/light-minute` | wikipedia | https://en.wikipedia.org/wiki/Speed_of_light |
| `sun-synchronous` | `orbits/sun-synchronous` | wikipedia | https://en.wikipedia.org/wiki/Sun-synchronous_orbit |
| `frozen-orbit` | `orbits/inclination` | wikipedia | https://en.wikipedia.org/wiki/Frozen_orbit |
| `constellation-coverage` | `orbits/orbit-regimes` | wikipedia | https://en.wikipedia.org/wiki/Satellite_constellation |
| `launch-azimuth` | `orbits/inclination` | wikipedia | https://en.wikipedia.org/wiki/Launch_window |
| `ground-track-shift` | `orbits/orbit-regimes` | wikipedia | https://en.wikipedia.org/wiki/Ground_track |
| `visibility-window` | — | wikipedia | https://en.wikipedia.org/wiki/Satellite_pass |
| `iss-pass` | `orbits/keplerian-orbit` | wikipedia | https://en.wikipedia.org/wiki/Satellite_pass |
| `planet-elongation` | `orbits/synodic-period` | wikipedia | https://en.wikipedia.org/wiki/Elongation_(astronomy) |
| `max-elongation` | `orbits/synodic-period` | wikipedia | https://en.wikipedia.org/wiki/Elongation_(astronomy) |
| `retrograde-motion` | `orbits/synodic-period` | wikipedia | https://en.wikipedia.org/wiki/Apparent_retrograde_motion |
| `planet-altitude` | — | wikipedia | https://en.wikipedia.org/wiki/Horizontal_coordinate_system |

## i18n
New UI keys `lab.ui.learn-more` + `lab.ui.learn-more-science` translated ×14; source
names (HyperPhysics / NASA Glenn / Wikipedia) are proper nouns, never translated.
