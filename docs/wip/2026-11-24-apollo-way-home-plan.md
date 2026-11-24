# Apollo's way home on /fly: plan (2026-11-24, draft for the operator)

Operator wish (2026-11-24): after an Apollo lunar landing, the flight continues: LM ascent, docking with
the CSM, LM jettison, trans-Earth injection (TEI), the coast home, CM/SM separation, re-entry and
splashdown under three mains. Basis: a code survey by a planner agent (sonnet); line numbers are from
that survey and unverified. Nothing built yet.

## What exists today
- No act after a lunar landing: `FlyAct = opening|ascent|coast|cruise|descent|recovery`
  (`src/lib/fly/flight-phase-controller.ts`); a Moon touchdown leaves /fly for `/moon?site=…&from=descent`
  (`src/routes/fly/+page.svelte`, `handleTouchdown`).
- **Suspected bug, check first:** `computeTimeline` (`src/lib/fly-mission-apply.ts`) sets `arr_day` to the
  `earth_return` time (8.13 d for Apollo 11), and the landing act fires at `arr_day`
  (`fly-frame-runner.ts`), so the landing may start at splashdown time, not after LOI.
- Earth re-entry is ready: `EARTH_CAPSULE_REENTRY`, `CAPSULE_MAINS['apollo-cm']` (3 × 25.5 m), the
  sourced `apollo8.json` profile (11,039 m/s, MSC-PA-R-69-1) and `LUNAR_RETURN_CAPSULE`. No CM/SM
  separation event yet.
- LM model (`showcase/lunar-module.ts`) builds the descent and ascent stages as separate, unnamed
  groups; the CSM (`apollo-csm-block-ii`) has named `service-module` / `descent-module`;
  `dockedApolloCsm` mates them.
- `fly-cislunar-scene.ts` already models `ascent` and `tei_coast` on the round trip.
- Mission JSON has `ascent`, `tei`, `earth_return` events (MET days); no docking event; splashdown only
  in text.

## Design: one new act, `return` ("Way home"), four phases
1. **R1 LM ascent:** scripted (not integrated) rise, pitch-over, orbit insertion; the descent stage
   stays on the surface.
2. **R2 rendezvous and docking:** a short scripted approach to the CSM, docking, LM jettison.
3. **R3 TEI and coast:** reuse the cislunar scene on the return leg; TEI burn beat with the `tei`
   event's Δv.
4. **R4 re-entry and splashdown:** the existing Earth descent act with a per-mission
   `<id>-return.json` profile modelled on `apollo8.json`, plus a new CM/SM separation beat.

Entry into the act: a "Continue: the way home" button at the end of the landing (or auto-play: the
operator's choice), the `/moon` hand-off kept as the other option.

## Data per mission (sourced: Apollo Flight Journal, Apollo Lunar Surface Journal, mission reports)
LM liftoff time and burn length, insertion altitude and speed, docking, LM jettison, TEI time and Δv,
CM/SM separation, entry interface time / speed / angle, drogue and main times, splashdown time and
place. Anything not published goes in `estimatedFields`; no invented figure. A science-reviewer pass
per profile.

## Files
New: `src/lib/fly/return-flight.ts`, `src/lib/three/fly-return-scene.ts`,
`static/data/return-profiles/<id>.json`, `static/data/descent-profiles/<id>-return.json`.
Changed: `flight-phase-controller.ts`, `src/routes/fly/+page.svelte`, `descent-hud.ts` + `hud-labels.ts`,
`showcase/lunar-module.ts` (name the stages), `descent-models.ts`, `messages/*.json` (14 locales),
TA.md, an ADR for the new act, the module READMEs, the descent-profile count (79) and its doc count.

## Order (about 30 minutes a step, each with a picture for the operator)
0. Check the `arr_day` finding in the browser; fix it first if real.
1. Name the LM stages; the "Continue" entry.
2. R1 ascent.
3. R2 docking and jettison.
4. R3 TEI and coast.
5. R4 for Apollo 11 only: the whole chain once.
6. Apollo 12, 14–17 data, sourced.
7. i18n, ADR, TA.md, e2e on both projects, the coverage gate.

## Luna 16/24 and Chang'e 5/6
- Luna 16/24: partial fit (direct ascent, no docking); needs sourced ascent / TEI / return events first.
- Chang'e 5/6: fits R1–R3 (ascender docks with the orbiter); the skip re-entry needs its own profile.
- Recommendation: Apollo first; the Soviet and Chinese chains later (as RFC-034 §13 says).

## Risks
The `arr_day` finding may change the trigger design; many figures to source; the act seams and the
scrubber bands in `+page.svelte` are fragile; running the cislunar scene return-only is unproven.

## Not doing
Integrated ascent or rendezvous physics; reusing the LEO coast scene; Luna / Chang'e in the same pass.
