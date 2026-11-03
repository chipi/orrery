# /fly after the launch — flight and descent analysis

**Date:** 2026-11-02 · **Scope:** everything after the injection burn: cruise, flybys, orbit
insertion, descents and landings, returns and re-entry. **Standard:** each mission follows its
real flight (the bar the launch pass just met). This is a survey of what the app plays today
against that bar; nothing here is fixed yet.

## How it works today

- **Acts.** `src/routes/fly/+page.svelte` runs one act machine (`flyAct`: opening → ascent →
  coast → cruise → descent → recovery), reduced by `src/lib/fly/flight-phase-controller.ts`.
- **Cruise.** Heliocentric missions play in `three/fly-helio-*`, Moon missions in
  `three/fly-cislunar-*` (ADR-058, ADR-077); `three/fly-frame-runner.ts` drives both. Beats come
  from `flight.events[]` (types: `tcm` 137, `flyby` 86, `launch` 72, `edl_or_oi` 56,
  `tli_or_tmi` 54, `arrival` 44, `earth_return` 12, `phasing` 10, `anomaly` 10, `tei` / `loi` /
  `descent_start` / `ascent` 7 each, `separation` 3, `parking_orbit_exit` 1).
- **Orbit insertion** is a callout beat (`physics/transfer/orbit-insertion.ts`,
  `fly/fly-clock.ts`), with no burn drawn.
- **Descent.** One descent profile per mission (`static/data/descent-profiles/<mission>.json`,
  76 files, 12 archetypes) flown by `physics/descent/descent-physics.ts` in
  `components/DescentScene.svelte`. Moon, Mars and Venus hand off to their surface routes; Earth
  capsules end on the recovery card; Titan, Jupiter, comet and asteroid rest on the last frame.
- **Models.** EDL stacks per landing site (`three/descent-models.ts`, generic per-body fallback),
  8 capsule families (`three/capsule-models.ts`), 35 cruise stacks
  (`three/lander-cruise-models.ts`), landed models for Moon (24), Mars (14), Venus (3).

## Where it falls short of the real flights

### 1. A mission plays one descent, so landers never come home

A profile is keyed by mission id, one per mission. Apollo 11's is its lunar landing, so its
return (TEI, the 11 km/s entry, splashdown) is never played; only Apollo 8, which did not land,
gets the lunar-return entry. The same cut hits every flight that landed (or touched) and came
back:

| Flights | Real end of mission | Plays today |
| --- | --- | --- |
| Apollo 11, 12, 14, 15, 16, 17 | CM lunar-return entry, splashdown | lunar landing only |
| Apollo 10, 13 | lunar-return entry, splashdown | no descent at all |
| Artemis II | Orion skip entry, splashdown | no descent (has a "Splashdown" event) |
| Luna 16, 24 · Chang'e 5, 6 | return capsule re-entry and landing | lunar landing only |
| Hayabusa, Hayabusa2, OSIRIS-REx | sample capsule re-entry | target approach only |

### 2. Orbit insertion has no real burn

MAVEN, Juno, Cassini (SOI), Mangalyaan, Hope, Akatsuki, LRO, Chandrayaan-1 and the rest insert
with their own engines. The app shows a callout and the generic event plume
(`fly/fly-frame-burn.ts`, one cone for every burn type) — no engine, no duration.

**Correction (2026-11-03):** the first version of this note said no plume was drawn at all.
That was wrong: the survey missed `fly-frame-burn.ts`. The generic plume also had two bugs,
both fixed: it was drawn reversed (every burn's flame on the wrong side of the ship) and anchored
at the true trajectory point rather than at the ship glyph, so in flyby and arrival shots it sat
beside the planet.

**Done 2026-11-03 (heliocentric orbiters).** `orbit-insertion-burns.ts` records the engine,
kind and duration of 13 sourced insertion burns. The arrival shot fires a retrograde plume
from the ship — main engine, the Star 48B solid motor (Magellan) or Akatsuki's four RCS jets —
and the callout reads APPROACH → CAPTURE BURN · engine · minutes · Δv → ON ORBIT (the burn
had stayed lit after capture). Cassini, Juno and MESSENGER got their sourced Δv, without which
they had no insertion beat at all. **Not done:** the three lunar orbiters (LRO,
Chandrayaan-1, Clementine) play in the cislunar scene, which has no plume yet; Clementine's
burn duration is unsourced; the planned arrivals (BepiColombo, Europa Clipper, JUICE, MMX) have
no published burn and keep the callout only. Sources sit beside each entry in
`orbit-insertion-burns.ts`; figures from search summaries only are marked there.

### 3. Cruise beats are missing on many Moon flights

Apollo 8, 10, 12, 14, 15, 16, Chang'e 1, Luna 10, Lunar Prospector and SMART-1 carry no
`flight.events`; the cislunar scene runs on waypoints, so their LOI, TEI, descent-start and
ascent beats do not fire. (Apollo 11 and 17 have them.)

### 4. Generic stand-ins where the real vehicle differs

- **Missing landed model:** Tianwen-1's Zhurong (the profile and EDL stack exist); its descent
  falls back to the generic Mars lander.
- **One generic bus for every small-body sampler:** Hayabusa, Hayabusa2, OSIRIS-REx and NEAR
  Shoemaker all descend as the same "asteroid sampler bus".

**Correction (2026-11-03):** the first version listed the Moon landers (Luna, Chang'e,
Chandrayaan-3, SLIM, Beresheet, Blue Moon, Artemis) and Huygens / Philae as generic. Wrong: the
lunar stack wraps each mission's own landed model (`moon-lander-models.ts` has all of them),
and Huygens and Philae have dedicated builders.

### 5. Real descents with no profile

- Beagle 2 (carried by Mars Express).
- MMX's rover / sample return (planned).
- DART's impact.
- The Vega balloons (only the landers fly).
- The two Starship Mars flights: they have a profile but no `flight` block (no events, no
  interplanetary profile).

### 6. Data that can drift

The 37 lander missions carry `flight.arrival.edl_system / edl_duration_s /
touchdown_velocity_ms / entry_velocity_km_s` while the registry says the profile is the single
source of truth. Nothing checks that the two agree.

**Done 2026-11-03:** `descent-arrival.test.ts` now fails on any drift. It found 11 missions out of
step — 8 by a rounding second, and three real ones: Curiosity 351 → 548 s, Perseverance
351 → 516 s, Tianwen-1 645 → 487 s, all re-derived. The profiles' durations themselves are the
open question: Curiosity's entry-to-touchdown is widely quoted as about seven minutes, so its
548 s goes on the profile-verification list (item 2 of the order below).

### 7. Docs and debugging

- `docs/rfc/RFC-034.md` still says Cassini/Huygens and NEAR are not shipped (both are).
- TA.md says Venus hands off to /venus; RFC-034 §12 says there is no Venus surface handoff.
  One of them is wrong.
- **Done 2026-11-03:** the code hands Venus off to `/venus` (`handleTouchdown`), so RFC-034
  was stale; dated update notes added to RFC-034 §12 and the Phase-2 list, TA.md's
  "Titan/Eros pending" corrected, and the stale comment in `+page.svelte` fixed.
- The `?debug=1` Page tab has an Earth re-entry block but nothing for planetary EDL.
- e2e covers the Apollo 11 and Curiosity descents only.
- **Done 2026-11-03:** the FLY debug tab shows the live planetary descent; the descent e2e mounts
  one mission per archetype (13 specs).

### 8. Mars descents ran several times too long

Every Mars profile entered at an invented 7.5° with too small a ballistic coefficient, so the
capsule shed its speed high up and floated down for 20–35 minutes. **Done 2026-11-03** from the
EDL reconstructions (NASA / ESA papers, cited in each profile), with a `dynamicGamma` flag so a
ballistic entry flown at its sourced angle flattens as it slows, and an engine-out fix (a lander
whose tanks ran dry used to hold its speed instead of falling):

| Mission | Sourced entry → touchdown | Was | Now |
| --- | --- | --- | --- |
| Pathfinder | 306 s | 1,566 s | 317 s |
| Spirit / Opportunity | ~352 / ~350 s (predicted) | 1,373 / 1,366 s | 329 / 330 s |
| Phoenix | 446 s | 2,227 s | 442 s |
| InSight | 349 s | 2,183 s | 390 s |
| Curiosity | 431.5 s | 548 s | 436 s |
| Perseverance | 418.7 s | 516 s | 405 s |
| Schiaparelli (crash) | 306 s, ~150 m/s | 1,351 s, 43.5 m/s | 319 s, 131 m/s |
| Viking 1 | — (chute ~6 km, 2.4 m/s) | 744 s | 268 s |

Estimates, declared in each profile's `estimatedFields`: Curiosity's and Perseverance's
bank-averaged L/D (0.17 / 0.18), InSight's Cd·A, Schiaparelli's entry angle, Viking 1's entry
altitude. **Not done:** Mars 3 and Tianwen-1 (no sourced EDL timeline found).

### 9. Moon powered descents braked at full engine and froze on screen

The lunar profiles were one braking phase at the engine's maximum thrust, the mass never went
down as propellant burned, the guided thrust ignored the part needed to hold the vehicle up on a
shallow path, and the descent time warp (built for Mars entry) mapped the first 45 % of a powered
descent onto t = 0. **Done 2026-11-03:**

- **Physics** (`descent-physics.ts`): propellant mass is burned off each step; guided thrust is
  `hypot(along, across)` with orbital relief (v²/r); a per-phase `maxThrustN`; an engine-out
  vehicle falls under gravity; no peak-heating beat on airless bodies.
- **Archetype** (`descent-profile-registry.ts`): `LUNAR_POWERED` becomes braking (to the high
  gate speed) → approach (to the low gate) → vertical final, when a profile sets `brakingFpaDeg`.
- **Time warp** (`descent-timewarp.ts`): identity when there is no ballistic entry.
- **Scene** (`descent-scene.ts`): on airless bodies the lander pitches from the braking and
  lift-support components of the thrust.

Braking thrust and angle are fitted (declared in `estimatedFields`) so the total matches the
source; Apollo 11's fit also hits the high gate (2.2 km at 505 s against 2.3 km at 506 s).

| Mission | Sourced | Was (one phase, full thrust) | Now |
| --- | --- | --- | --- |
| Apollo 11 | 755 s | — | 758 s |
| Apollo 12 / 14 / 15 / 16 / 17 | 718 / 766 / 740 / ~730 / 725 s | — | 717 / 773 / 718 / 742 / 730 s |
| Luna 16 / 24 | ~360 / ~360 s | 327 / 315 s | 362 / 358 s |
| Luna 17 / 21 | none found (fitted to Luna 16) | 321 / 321 s | 355 / 355 s |
| Chang'e 3 / 4 | ~720 s (CE-4 flown as CE-3) | 646 / 646 s | 719 / 719 s |
| Chang'e 5 / 6 | 830 / ~900 s | — / 842 s | 817 / 899 s |
| Chandrayaan-3 | ~19 min (~1,140 s) | — | 1,111 s |

Touchdown speeds are the reported ones where a report gives one (Apollo 11 0.83, 12 0.6,
15 2.07, 16 0.46, 17 0.9, Chang'e 5 1.99 m/s); the rest land at 1.0 m/s. The "Was" column is
blank where the earlier value was not recorded before the change.

### 10. The other Moon, Mars, Venus and small-body profiles

**Done 2026-11-03**, against the same research notes (sources cited in each profile):

| Mission | Sourced | Was | Now | Note |
| --- | --- | --- | --- | --- |
| Venera 13 | ~63 min, 7–8 m/s, 138–167 g | 2,985 s, 11.1 m/s, 166 g at 112 km | 3,776 s, 7.4 m/s, 145 g at 71 km | 760 kg lander (was 1,450); entry 19.5°, was 65° |
| Vega 1 / 2 | 3,404 / 3,286 s; 130 / 139 g | copies of Venera 13 | 3,407 / 3,289 s; 126 / 134 g | entry 18.2° / 19.1° |
| Huygens | chute at 157 km ~270 s after entry; touchdown 9,140 s, ~4.5 m/s | 11,967 s, 7.5 m/s | chute 277 s, drogue T0+842 s, 9,153 s, 4.6 m/s | 2.7 m shield: `entryCdA` 8.6, was 2.5 |
| Galileo probe | ~230 g; chute at 23 km (+167 s); loss at 22 bar after 61.4 min | 1,878 s, crush at −82 km | 246 g at 96 km, chute 141 s, loss 3,691 s at −133 km | |
| Mars 3 | soft landing, 5.7 km/s, 1,210 kg | crash at 66 m/s, 2,155 s | 2.4 m/s, 336 s | the test listed it as a crash; the site's text says soft |
| Tianwen-1 | ~9 min, ~460 m/s at chute | 487 s | 538 s, ~430 m/s at chute | |
| Luna 9 | retro from 75 km, capsule out at 5 m, 6.1 m/s | 2 km start, 18.6 m/s | 188 s, 6.4 m/s | new `airbagReleaseAltM` |
| SLIM | ~20 min, 2 × 500 N | generic 100 s | 1,016 s | no hover in the model |
| Hayabusa2 | 45 m → contact in 22 min | 400 s from 40 m | 1,322 s | |
| Hayabusa / OSIRIS-REx / NEAR / Philae | — | — | last 54 m / 54 m / 5 km / 100 m | final leg only; hours-long approaches not flown |

Also fixed: Galileo's `probe_signal_lost` beat fired twice, the first at the start of the last
phase (~40 min early). Beresheet keeps its numbers (no descent timeline found; it ends at the
reported ~139 m/s). Blue Moon Mk1 and the Artemis landers have not flown and stay generic.

**Atmospheres:** Venus, Titan and Jupiter used one isothermal exponential. It was far too
dense high up, so the probes decelerated too early (Venus peak g at 112 km two seconds after
entry; Huygens at its chute at 748 s, plan 240 s; Galileo at 485 s, plan 115 s), and on
Jupiter it reached 23 bar at −82 km instead of ~−130 km. They now fly the probes' measured
profiles (`descent-atmosphere-tables.ts`: Pioneer Venus Sounder, Huygens HASI, Galileo ASI
from PDS / ESA PSA), and ballistic probes on these bodies fly `dynamicGamma` so they pitch
over as they slow. The descent time warp (built to compress Mars's long entry) now only
applies when the entry is the long part: on these profiles it stretched a 28 s entry up to
60× and left the clock at E+00:00 for minutes. The Galileo ASI velocity column (0.44 km/s still at 23.4 km) puts the
real chute opening near 23 km, not the planned 47 km. The Venus entry angles and peak g are
Dutta et al. 2012's simulated values, not flight data.

## Not checked yet

This survey read the code and data. It did NOT check, and the gaps above are not the whole list
until these are done:

- **Profile numbers vs sources:** Mars (§8), the Moon (§9), Venus, Titan, Jupiter and the
  small bodies (§10) are done. The 31 Earth capsules are not.
- **Browser behaviour:** no descent, flyby or orbit-insertion beat was flown in the browser.
- **Event timing:** cruise event times (TCMs, flybys, arrival dates) were not checked against
  mission records. One is known wrong: Clementine's TLI sits at MET 0.5 d, the real one was
  ~9 days.
- **Model accuracy:** shape, scale and sequence (aeroshell, chute count, airbag bounce, skycrane
  cable length) of the existing dedicated stacks, against photos and mission reports.
- **Arrival fields vs profiles:** the 37 lander missions' `flight.arrival` fields were not
  compared with their profiles (item 6).
- **Earth capsule fidelity:** the 31 capsule re-entries (apo/peri, landing points, recovery
  ships) are flagged approximate in `docs/wip/2026-07-19-tier1-earth-orbit-reentry.md`; not
  re-checked.
- **Flyby geometry:** the 86 flyby events' closest-approach distances and times were not checked.

## Order of work

Returns (item 1) are out of scope for now (operator, 2026-11-02): a mission keeps its one
descent. The rest, in order:

1. **Orbit-insertion burns:** a generic arrival burn from the spacecraft's own engine, timed from
   sources, for every orbiter.
2. **Verify every descent profile against sources** (the "not checked" list), mission by
   mission, as the launch pass did.
3. **Missing cruise events** on the ten Moon flights, and the Clementine TLI timing.
4. **Vehicle-specific stacks and models** where the generic ones stand in (item 4), then the
   missing descents (item 5).
5. **Arrival fields vs profiles** (item 6): one source of truth, with a check.
6. Docs, debug tab and e2e (item 7).
