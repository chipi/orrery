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

### 2. Orbit insertion has no burn

MAVEN, Juno, Cassini (SOI), Mangalyaan, Hope, Akatsuki, LRO, Chandrayaan-1 and the rest insert
with their own engines. The app shows a callout.
The launch pass now draws the injection burn from the stage that made it; the arrival side has
no equivalent: no engine plume, no attitude, no burn duration.

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

- **Descent stacks on the generic lunar fallback:** Luna 16/17/21/24, Chang'e 3–6,
  Chandrayaan-3, SLIM, Beresheet, Blue Moon MK1, Artemis IV/V.
- **Generic per-body stacks:** Hayabusa2 (asteroid), Rosetta/Philae (comet), Huygens (Titan).
- **Missing landed model:** Tianwen-1's Zhurong (the profile and EDL stack exist).

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

## Not checked yet

This survey read the code and data. It did NOT check, and the gaps above are not the whole list
until these are done:

- **Profile numbers vs sources:** no descent profile's entry speed, flight-path angle, masses,
  chute / retro / skycrane timings or touchdown speed was compared with a published source.
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
