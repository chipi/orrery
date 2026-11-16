# Slice G1 brief — Plan to Fly: grouped destinations, the chosen rocket and a payload carried across, a launch that starts, launch and descent beats on the play bar (PL1, PL2, PL3, FY3)

Read-only brief, written at HEAD `8f0a5872bce` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only scripts (scratchpad `gbr-rockets.mjs`, `gbr-resolve.mjs`, `gbr-resolve2.mjs`, `gbr-payload.mjs`, `gbr-sched.mjs`, run with the repo's `tsx`, not in the repo; their output is quoted). Screenshots of `/plan` and of plan-style `/fly` URLs were taken against the shared dev server `http://[::1]:5180` with the repo's Playwright Chromium (`gbr-shots.mjs`; §2.7 lists what they showed). No code or data was changed. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 92: "Waits on: —"), so the forks in §12 are about shape and scope. G2 (Fly visuals) and G3 (Ascent) are separate briefs; decisions are numbered across the three, G-1 to G-9 here.

## 0. Answer first

1. **Plan hands Fly four things and never the rocket.** `flyMission` (`src/routes/plan/+page.svelte:781-793`) builds `?dest=<id>` (left out for Mars), `type=landing|flyby`, `dep=<day>`, `tof=<days>`. The rocket the user picked (`selectedRocketId`, 13 rockets in `static/data/rockets.json`) only gates the button (`viable`, `:743`) and is not sent. `/fly` has no `rocket=` handling at all (`git grep "rocket" src/routes/fly` finds no URL read). The only `?rocket=` in the repo is read by `/plan` itself (`:285-291`, from the Lab), and `/plan` does not write it back to its own URL, so a reload or a share loses the pick.
2. **The Fly side then invents an empty mission.** `computePlanApply` and `computePlanApplyMoon` (`src/lib/fly-mission-apply.ts:669-678`, `:744-753`) set `vehicle: '—'`, `payload: '—'`, no `id`, no `dest`, no `fleet_refs`. The left HUD's VEHICLE row prints the dash (`+page.svelte:4013-4015`; the HUD has no payload row) and the opening card prints both dashes (`:3834-3855`). That is PL2: "payload is empty".
3. **The LAUNCH button on a plan flight is a dead button, not an absent one.** `resolveLauncher(undefined, '—')` returns `{"id":"","name":"—"}` (the dash slugs to the empty string; run: `gbr-resolve2.mjs`), so `hasLaunchProfile` is `true` and `launchAvailable` (`+page.svelte:324`) is `true`: the opening card draws "start with launch" (`:3925-3934`). `startLaunch` (`:352-369`) then calls `loadLaunchProfile('')`, which returns `null` (same run), and the `.then` returns without doing anything. That is PL3: "no launch sequence".
4. **Nine of the 22 destinations do not reach a Fly flight at all.** `/plan` lists 22 (`src/lib/plan/destinations.ts:7-30`), nine of them planetary moons (Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton; `MoonMissionDestId`, ADR-086). `loadMissionFromUrl` (`+page.svelte:2232-2257`) accepts `moon` and the keys of `DESTINATIONS`; `europa` is neither, so it falls through to the default ORRERY DEMO scenario (`:2259-2268`). Found while tracing PL2; not in the operator's list (§2.6, Decision 4).
5. **PL1 is a flat 22-row `select` in a tour order that ends on Bennu.** `DESTINATION_IDS` runs Moon, Mercury, Venus, Mars, Phobos, Deimos, Vesta, Ceres, Psyche, Jupiter, Io, Europa, Ganymede, Callisto, Saturn, Titan, Enceladus, Uranus, Neptune, Triton, Pluto, **Bennu**: a near-Earth asteroid after Pluto.
6. **FY3: the play bar already has two marker rows, both for the cruise, both hidden while the launch plays.** Milestone ticks (`:4255-4285`) need `mission.flight.events`; FD-stage ticks (`:4287-4309`) need `arcTotalDays > 0`; both carry `&& !showLaunch`. The ascent beats (`buildAscentBeats`: MAX-Q, MECO, STAGE SEP, FAIRING, SECO, ORBIT; `src/lib/orbital/ascent-hud.ts:75-103`) and the descent beats (`EDL_BEAT_LABEL`, `descent-hud.ts`) are drawn on the launch and descent scenes' own strips, not on the master bar. The bar gives the ascent a fixed slice (`ascentScrubberFraction` 0.15, 0.1 to 0.2 for an Earth-orbit flight) and the descent a 0.2 tail (`+page.svelte:1677-1690`), so the positions are known (`pointToScrubber`).
7. **Recommendation:** (a) `rocket=<rockets.json id>` on `/fly`, written by Plan, read by Fly, mapped by one pure function to a launcher id, a vehicle name, `fleet_refs`, a `dest` and a payload line (Decision 1); (b) the payload is the generic spacecraft the ascent already draws (`buildGenericPayload`), labelled with the mass the ascent integrates (Decision 2); (c) a plan flight's opening card gets a working LAUNCH button and `?launch=1` works for it (Decision 3); (d) the nine moon destinations fly the host planet's arc with the moon named as the target, drawn by G2 (Decision 4); (e) the plan's own destination `select` gets five `optgroup`s (Decision 6, 7); (f) one marker row on the bar for the whole journey: ascent beats, cruise milestones, descent beats, thin ticks with a hover label, declutter at the bar's narrow slices (Decisions 8, 9).
8. **Cost:** no data change; three new pure modules (`src/lib/plan/rocket-handoff.ts`, `src/lib/orbital/flight-plan-beats.ts`, `src/lib/fly/journey-markers.ts`), seven new message keys (5 group labels, the payload label, 1 aria template, §6), unit tests, one new e2e spec on three projects. No image.
9. **Needs the operator before code:** nothing blocks; 9 forks in §12 (G-1 to G-9).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 292-294 (PL1 to PL3) and 303 (FY4 is the HUD, FY3 is the play bar: line 302); slice row 397)

| ID | Text | State at HEAD |
|---|---|---|
| PL1 | "Destination dropdown is too long with no organisation; restructure to find a destination easily." | A flat `select` of 22 options, Bennu last (§2.1). |
| PL2 | "A plan opened in Fly does not carry the chosen launch; payload is empty (should have one)." | `rocket` is not in the URL; `vehicle` and `payload` are dashes (§2.2, §2.3). |
| PL3 | "No launch sequence; add the option as for other missions." | The button is drawn and does nothing (§2.4). |
| FY3 | "Flight-plan markings on the play bar at the bottom (with play/pause)." | Cruise ticks only, hidden during the launch; no ascent or descent beats on the bar (§2.5). |

Done when (plan row 397): "e2e: plan → fly shows rocket, payload, working launch, markers".
Plan wording that is outdated: the slice row says "destinations grouped (inner, asteroids, Jupiter/Saturn systems, outer)": the 22 ids also hold Earth's Moon and Pluto, which need a home (Decision 6); "(`rocket=` param, `vehicle`, `fleet_refs`)": `rocket=` is new on `/fly`, and `ADR-026` line 48 says the button sends `/fly?mission={id}&dest=...` while the code has no mission id (Decision 1 amends the ADR).

## 2. Current state (file:line at `8f0a5872bce`)

### 2.1 The destination control (PL1)

`src/lib/plan/destinations.ts:7-30` is the order; `+page.svelte:930-942` renders `{#each DESTINATION_IDS}` as `<option>` inside one `select.dest-select`, labelled through `destinationLabel` (keys `plan_destination_*`, one per id, in 14 locales). `/lab` already uses `<optgroup label={t(grp.labelKey)}>` (`src/routes/lab/+page.svelte:118-125`), so the pattern exists in the repo. The same list feeds the body panels' "Plan mission" chip (`isPlanDestination`), which does not change.

How the 22 fall into the operator's groups (my reading of `DESTINATIONS` and `MOON_MISSION_DEST_IDS`, not a data field): **inner system** Moon, Mercury, Venus, Mars, Phobos, Deimos (6); **asteroids and small bodies** Vesta, Ceres, Psyche, Bennu (4); **Jupiter system** Jupiter, Io, Europa, Ganymede, Callisto (5); **Saturn system** Saturn, Titan, Enceladus (3); **outer system** Uranus, Neptune, Triton, Pluto (4). Ceres is a dwarf planet in the main belt and Pluto a dwarf planet in the Kuiper belt; Bennu is a near-Earth asteroid; those three placements are labelling choices (Decision 6).

### 2.2 What Plan sends

`flyMission` (`+page.svelte:781-793`): `dest` unless Mars, `type` lower-case, `dep` and `tof` rounded (the Moon keeps two decimals, `planCoord` `:775-779`), then `goto(localHref('/fly?...'))`. The button is disabled unless `viable` (`dvBudget >= readout.dv`), so a chosen rocket that reaches `/fly` can always do the trip. State in `/plan`: `rocketList` (13, `getRockets`), `selectedRocketId`, the sticky `userPickedRocket`, and `suggestRocket` (the cheapest viable one). `ROCKET_FLEET_ID` (`:72-86`) maps a rocket id to its fleet entry for the link.

`static/data/rockets.json` ids: falcon-heavy, starship, sls-block-1, atlas-v-541, long-march-5, ariane-6, lvm3, pslv-xl, h3, h-iia, long-march-3b, soyuz-fregat, proton-m. Fields used below: `delta_v_capability_km_s`, `payload_to_leo_kg`, `payload_to_mars_kg` (a TMI figure, `payload_to_mars_definition`), `launch_site` (a string).

### 2.3 What Fly builds from it

`/fly` has three URL shapes: `?mission=<id>` (a mission or scenario), `?dest&type&dep&tof` (a plan selection) and nothing (the ORRERY DEMO). `loadMissionFromUrl` (`+page.svelte:2220-2290`) takes the plan branch when there is no `id` and `dep` and `tof` are set: `moon` goes to `applyPlanSelectionMoon`, a key of `DESTINATIONS` to `applyPlanSelection`; anything else falls through.

`computePlanApply` returns `missionMeta: { name: 'EARTH → MARS · LANDING', vehicle: '—', payload: '—', dv_total, dv_used: null, dep_label, arr_label, timeline, isFromData: true }` and `appliedId: 'plan-<dest>-<type>'`; `computePlanApplyMoon` the same with `'plan-moon-landing'`. `LoadedMission` (`:60-109`) already has the slots a handoff needs: `id`, `vehicle`, `dest`, `payload`, `fleet_refs`. `applyPlanSelectionToPage` (`src/lib/fly/apply-to-page.ts:140-167`) writes them as they come, clears the spacecraft model, and arms the opening.

How a launch is decided: `launchAvailable = hasLaunchProfile(mission.fleet_refs, mission.vehicle)` (`:324`); `startLaunch` resolves the launcher, loads its profile (`loadLaunchProfile`: a flagship JSON for the 40 ids in `FLAGSHIP_IDS`, else `buildGenericProfile` at 6,000 kg), preloads the craft for `mission.id` (`preloadFlyCraft`, false for an unknown id) and dispatches `startLaunch`. `launchDossier` and `resolveInjectionBurn` read `mission.dest` (MOON gives TLI, MARS TMI, else INJECTION) and `mission.flight?.launch?.vehicle_stage`. The scene's payload for an id with no craft is `buildGenericPayload` (`src/lib/three/ascent-scene.ts:134`): a box bus, two wings, a dish.

### 2.4 The dead launch button (PL3)

Run of `gbr-resolve2.mjs` against the real registry:

```
resolveLauncher(undefined, "—")      = {"id":"","name":"—"}
hasLaunchProfile(undefined, "—")      = true
resolveLauncher(undefined, undefined) = null
loadLaunchProfile("")                 = null
```

So on a plan flight `launchAvailable` is true, the opening's "start with launch" button is drawn (`+page.svelte:3925-3934`), and `startLaunch` ends silently at `if (!p) return` (`:362`). The `?launch=1` deep link cannot work either: the auto-start effect requires `deepMissionId != null` (`:381-387`) and a plan URL has no `mission=`.

### 2.5 The play bar (FY3)

`.scrubber` (`+page.svelte:4217-4343`): a play chip, `.scrub-track-wrap` (a styled fill, the native range input, `milestone-track`, `fd-stage-track`), the speed chips. Once a launch act is loaded the value is the master fraction (`hasLaunchAct`, `masterU`, `:1691-1720`); `cruiseTickPct` maps a cruise MET into `[seam, 1]` (`:1723-1726`, `cruiseTickPercent`). The master timeline (`makeTimeline`, `src/lib/orbital/ascent-clock.ts:51-65`): ascent slice `coastAscentFraction` (0.15 interplanetary, 0.1 to 0.2 Earth-orbit), descent tail 0.2 when there is a descent profile, the cruise the rest.

Marker sources that exist: the cruise `mission.flight.events` (labelled, with MET days; a plan flight has none) and `FD_STAGES` ticks (a plan flight has them); the ascent events `launchSummaryFly.events` plus `maxQ` (`buildAscentBeats`); the descent events `descentSummaryFly.events` (`DESCENT_SEP_BEATS`, `descentSeparationTimes`, which already unwarps to scrubber time because the descent scene warps its clock). `fly-clock.ts:81-119` and `onMasterScrub` (`:1745-1770`) are the seams: a beat at ascent time `t` sits at `pointToScrubber({phase:'ascent', ascentT: t}, timeline)`.

The launch HUD already carries these beats as a "FLIGHT PLAN" list (`FlightPlan.svelte`; `LaunchScene.svelte:176-196` builds `planBeats`: LIFTOFF, the ascent beats, then PARKING ORBIT, the injection burn and SPACECRAFT SEP when the mission leaves orbit; the descent scene has its own). That list is very likely what the operator means by "flight-plan markings": the same beats, on the bar. The labels are English codes (`BEAT_LABEL`, `STATE_LABELS`, which double as identifiers) that every scene passes through `hudLabel` (`src/lib/orbital/hud-labels.ts`) when it renders them; `hudLabel` has a translated message for each (`hud_stage_sep`, `hud_fairing`, `hud_liftoff`, ...) and leaves the flight-dynamics acronyms (MECO, SECO, MAX-Q) unchanged in every locale. The existing tooltip template is `m.fly_milestone_aria({ label, days })` (days, not seconds).

### 2.6 Moon destinations (finding)

`GeoDestinationId` is only `moon` (ADR-085); the nine moons are `MoonMissionDestId` and ride their host planet's departure and TOF axes (`lambert-grid.constants.ts:121-133`: "Reached via a multi-leg patched-conic mission (heliocentric Earth→host + moon-orbit insertion) ... their porkchops ... ride their host planet's departure/TOF axes"). Plan sends `dest=europa&dep=&tof=` (host-planet days). `loadMissionFromUrl` does not know `europa` (`git grep -n -i "europa" src/routes/fly/+page.svelte src/lib/fly-mission-apply.ts src/lib/fly/apply-to-page.ts` finds none), so the user lands on the demo scenario with the wrong title, the wrong trajectory and no sign that anything was dropped. The helio scene does carry the moons (`MOON_SYSTEM` in `src/lib/three/fly-helio-scene.ts`, Phobos, Deimos and the Galileans as small untextured spheres); G2 draws them.

### 2.7 What the screenshots and DOM probes showed (dev server, `en-US`, headless Chromium with software GL; paths in §3)

- **PL1:** the `select` on `/plan?dest=mars` at 1440×900 has 22 `option`s and 0 `optgroup`s, in the order of §2.1 with Bennu last (`gbr-plan-mars-1440.png`, `gbr-report.json`).
- **PL2:** a plan flight's opening card reads "VEHICLE —  PAYLOAD —" (Mars, `gbr-fly-mars-3d.png`; Jupiter, `gbr-fly-jupiter-2d.png`; phone, `gbr-fly-mars-3d-390.png`), and the left HUD row reads "VEHICLE —" (`gbr-s2-mars-2d.png`, `gbr-s2-moon-2d.png`).
- **PL3:** the opening card on a plan flight draws "START WITH LAUNCH" (`fly-opening-launch` present on Mars, Jupiter and Moon plan URLs). Clicking it, with the page loaded and the opening still up, and waiting 8 s, left no `launch-scene` in the DOM; the same click on `?mission=curiosity` mounted it and titled it "Curiosity" (`gbr-click.json`: plan `launchSceneMountedAfterClick: false`, control `true`; `gbr-click-mars-plan.png`, `gbr-click-curiosity-control.png`). A dead button, as §2.4 derived from the code.
- **The moon destinations:** `/fly?dest=europa&type=landing&dep=9900&tof=1500` shows "ORRERY DEMO" ("This is a placeholder free-return demo. Pick a real mission..."), vehicle "Falcon Heavy", "Heliocentric free-return" (`gbr-s2-europa-2d.png`): Europa lands on the demo scenario, as §2.6 derived.
- **FY3:** the cruise bar of a plan flight carries only gold FD-stage diamonds (4 for Mars, 6 for Jupiter) and no milestone ticks (`milestoneTicks: 0`; `gbr-s2-mars-2d.png`); during a launch the bar carries only the fill and the play head, no marker, while the dossier's FLIGHT PLAN list on the right names MAX-Q, STAGE SEP, FAIRING, ORBIT, SECO with their times (`gbr-ascent-artemis2-t70.png`, `gbr-ascent-curiosity-t20.png`). The track is 1,109 px wide at 1440×900 and 216 px on a touch-emulated 390×844 phone (`gbr-shots2.json`: `track` [x, width]); the ascent slice at 15 % is therefore about 166 px and 32 px.
- **Load order:** a plan URL first paints the ORRERY DEMO scenario and replaces it with the plan flight within the first seconds (at 2.5 s the HUD still read "free-return / Falcon Heavy" on a Mars plan URL in the first run; at 7 s it read "Hohmann / —").

### 2.8 Tests that touch the area

`tests/e2e/plan.spec.ts:119-142` (FLY MISSION enabled or disabled by the budget, a click lands on `/fly`), `:152-290` (destinations by `?dest=`, the type radios, 12+ destinations' console errors), `plan-porkchop-refresh.spec.ts`, `fly.spec.ts`, `fly-launch.spec.ts` (Curiosity launch, timeline beats, master scrub), `fly-iconic-peakhold.spec.ts:66-80` (the `milestone-track` buttons by `aria-label`), `fly-phase-markers-parity.spec.ts`, `fly-apollo11-phase-markers.spec.ts`, `fly-curiosity-phase-markers.spec.ts`, `src/lib/fly-mission-apply.test.ts`, `src/lib/fly/apply-to-page.test.ts`, `src/lib/plan/destinations.test.ts`, `launch-profile-registry.test.ts`. None asserts what a plan flight shows for vehicle or payload, a working launch from a plan flight, or a marker on the bar during the launch.

## 3. Screenshot list (before the build and again after)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390; `en-US`, plus `de` and `ar` for the group labels. Taken for this brief, before (scratchpad `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`, files prefixed `gbr-`, not in the repo): `gbr-plan-mars-1440.png`, `gbr-plan-mars-390.png`, `gbr-plan-jupiter-1440.png` (the control and the page); `gbr-fly-mars-3d.png`, `gbr-fly-mars-3d-390.png`, `gbr-fly-jupiter-2d.png`, `gbr-fly-moon-3d.png`, `gbr-fly-europa-3d.png` (opening cards of plan flights); `gbr-click-mars-plan.png`, `gbr-click-curiosity-control.png` (after clicking the launch button); `gbr-s2-mars-2d.png`, `gbr-s2-moon-2d.png`, `gbr-s2-europa-2d.png`, `gbr-s2-pluto-2d.png`, `gbr-s2-mars-phone-3d.png` (the bar and HUD after the opening); `gbr-ascent-artemis2-t70.png` and `gbr-ascent-curiosity-t20.png` (the bar during a launch). Probe results: `gbr-report.json`, `gbr-click.json`, `gbr-shots2.json`.

After the build, same set plus: the destination `select` open on desktop (native pickers do not screenshot headless: the option list read through the DOM is the check), `/fly` after a Plan click for Falcon Heavy to Mars with the opening card, the launch at T+30 s, the bar at T+30 s with ascent markers, the same on phone, and a Europa flight.

## 4. Proposal

### 4.1 The handoff (PL2)

One pure module, `src/lib/plan/rocket-handoff.ts`: `ROCKET_HANDOFF: Record<rocketId, { launcherId, vehicleName, fleetId, siteName }>` and `resolveRocketHandoff(rocketId, destId, type)`. It returns `{ vehicle, fleetRefs: [{id: fleetId, role: 'launcher'}], dest: <Destination enum>, payload }`. The vehicle string is the one `resolveLauncher` recognises as a flagship; that matters because the rocket ids are not the launcher ids for three of them (run `gbr-resolve.mjs`):

| rocket id | as a `fleet_refs` launcher id | as the vehicle string |
|---|---|---|
| falcon-heavy, starship, sls-block-1, long-march-5, lvm3, h3, h-iia, long-march-3b | flagship | flagship |
| pslv-xl | `pslv` (canonicalised) | `pslv` |
| proton-m | `proton-k` (the older profile) | `proton-k` |
| atlas-v-541 | generic (id has the variant) | **`atlas-v`** |
| soyuz-fregat | generic | **`soyuz-fg-fregat`** |
| ariane-6 | generic | generic: no `ariane-6.json` in `static/data/launch-profiles/` (the model `buildAriane6` exists) |

So the handoff passes the vehicle **name** ("Atlas V 541", "Soyuz-2 Fregat", "Proton-M") and the fleet id from `ROCKET_FLEET_ID` for the link, and lets `resolveLauncher`'s alias list pick the profile: Atlas V 541 gets the Atlas flagship with four solids (`atlasVSrbCount`), Soyuz-Fregat the Fregat profile. Ariane 6 flies the generic 2-stage "representative" profile (tier shown); a flagship JSON for it is a data task, not G1 (§13).

`/plan` writes `rocket=<id>` into its own URL (it already reads it) and `flyMission` appends it. `/fly` reads `rocket` in `loadMissionFromUrl`'s plan branch, calls `resolveRocketHandoff`, and passes the result through `applyPlanSelection` / `applyPlanSelectionMoon` into `missionMeta`. A `rocket=` that is unknown is ignored (today's behaviour). `computePlanApply*` keep their pure signatures with one added optional argument.

### 4.2 The payload (PL2)

Today the ascent draws the generic bus for an id with no craft. The HUD should say what it is: `payload: "Generic spacecraft · <N> kg"` where N is the profile's `payloadKg` (the mass the ascent integrates: 6,065 kg Falcon Heavy, 26,500 SLS, 9,800 Atlas V 541, 3,780 Long March 3B, 6,000 for a generic profile; `gbr-payload.mjs`). `rockets.json` has a different number (`payload_to_mars_kg`: 13,000 Falcon Heavy, 17,000 SLS, 3,839 Atlas V 541): a published TMI capacity, which the ascent does not integrate (Decision 2). New message key for the label ("Generic spacecraft"), 14 locales. The payload shows where it is shown for every mission: the opening card's stat row (`:3852-3857`); the HUD has no payload row, and G1 does not add one.

### 4.3 A launch that starts (PL3)

1. `resolveLauncher` returns `null` for a vehicle string that slugs to nothing (the `'—'` bug is a registry defect on its own: a guard that `slug(...)` is non-empty, with a unit test `resolveLauncher(undefined, '—') === null`). That alone removes the dead button for any future caller.
2. With the handoff the plan flight has a real vehicle and `fleet_refs`, so `launchAvailable` is true for the right reason and `startLaunch` loads the profile. `mission.dest` for a plan flight is set from `dest` (MARS, MOON, JUPITER ...), which gives the injection burn the right beat (TMI, TLI, INJECTION).
3. `?launch=1` on a plan URL starts the launch (the effect's `deepMissionId != null` guard becomes "the loaded flight is the URL's": `mission.id === deepMissionId` for a mission, `lastAppliedMissionId` for a plan flight).
4. The spacecraft id is empty (`preloadFlyCraft('')` is false), so the scene draws `buildGenericPayload`; nothing to add.

### 4.4 Destinations grouped (PL1)

`PLAN_DESTINATION_GROUPS` in `src/lib/plan/destinations.ts`: an ordered list `{ id, labelKey, members }` over the same 22 ids; `PLAN_DESTINATION_IDS` stays (the flat list is derived from the groups, so the body panels' chip and the tests keep working). The select renders one `<optgroup label={m.plan_group_*()}>` per group. Within a group: the planet first, its moons after, by distance. A unit test asserts every id appears in exactly one group and the flat order is unchanged for the consumers.

### 4.5 One marker row for the whole journey (FY3)

The flight-plan beats become one pure source: `planBeats` moves out of `LaunchScene.svelte` into `src/lib/orbital/flight-plan-beats.ts` (the list on the HUD and the bar then cannot disagree). A pure `journeyMarkers(...)` in `src/lib/fly/journey-markers.ts` returns `{ id, kind: 'ascent'|'cruise'|'descent', pct, label, jumpTo }[]`: the ascent beats at `pointToScrubber` positions in `[0, seam]`, the cruise milestones and FD stages at `cruiseTickPct`, the descent beats in the tail; labels go through `hudLabel`. The two existing rows move onto it; the `&& !showLaunch` conditions go. Drawn as 2 px ticks on the track (the milestone dots' shape is kept for cruise), a hover and focus label (`.milestone-tooltip`), a click jumps (`onMasterScrub` semantics: ascent beats seek `launchT`, descent beats `descentT`). Declutter rule: markers closer than 10 px in the bar's real pixel width collapse to the first with a count in the label; the ascent slice is about 166 px wide at 1440 and 32 px on a 390 px touch phone (§2.7), where six beats cannot all show, so the rule is not optional.

A plan flight has no `flight.events`, so its row is the ascent beats, the FD stages and the arrival: still a row, no empty state.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on G1 |
|---|---|
| A4 (one chip) | The destination control is a native `select` today, not a chip; it stays one (Decision 7); the mission-type radios and FLY MISSION keep their chip look. The scrubber's play and speed chips are already `Chip`s. |
| A3 (accent) | Ticks use the existing tokens (`--color-accent`, gold for FD stages as now); no teal; `#889fe7` for the hover state. |
| A2 (page shell) | `/plan` and `/fly` are tool routes with no page shell; nothing changes. |
| B1 | No panel here. |
| F series (written in parallel) | Not read. G1 touches `/plan`, `/fly` and `src/lib/plan`, `src/lib/fly` only. |
| G2 | G2 draws the destination body and the moons; Decision 4 (b) depends on it. G1 and G2 both touch `src/routes/fly/+page.svelte` (CSS and the bar): order G1 then G2, or one worktree. |
| G3 | The ascent act that a plan flight now reaches is the one G3 re-directs; G1 only needs the launch to start. |

Plan ideas now outdated: "carry `vehicle` and `fleet_refs`" (the handoff carries a rocket id and derives both); "launch and descent beats as markers" (descent only exists for missions; a plan LANDING flight has no descent act, Decision 5).

## 6. i18n impact (14 locales)

New keys, by hand, glossary first (`docs/guides/i18n-style-guide.md`; names by the origin rule):
- Five group labels (`plan_group_inner`, `plan_group_asteroids`, `plan_group_jupiter`, `plan_group_saturn`, `plan_group_outer`) for Decision 6 (a): 5 × 14 = 70 strings. Short labels (the `select` is about 200 px wide on a phone).
- `fly_payload_generic` ("Generic spacecraft"): 14 strings.
- `fly_beat_aria` ("{label}, at {time}" for the ascent and descent beats, which are in seconds): 14 strings (Decision 9 (a)); the cruise keeps `fly_milestone_aria`. The tick text itself needs no new key: `hudLabel` already has a message per beat.
- No change to `plan_destination_*` (22 keys exist) or to the rocket names (data).

## 7. Data changes

None in G1. `static/data/rockets.json` is read, not edited. (A flagship `launch-profiles/ariane-6.json` and the missing profiles for Vulcan are listed in §13.)

## 8. Tests to add or change

**Unit (vitest):**
- `src/lib/plan/rocket-handoff.test.ts` (new): all 13 rocket ids resolve; `resolveLauncher(undefined, vehicle).id` is a flagship for the 10 that have a profile and `generic` only for `ariane-6`; the vehicle, `fleet_refs`, `dest` for Mars, Moon, Jupiter; unknown id returns `null`.
- `launch-profile-registry.test.ts`: `resolveLauncher(undefined, '—') === null`, `hasLaunchProfile(undefined, '—') === false`.
- `src/lib/fly-mission-apply.test.ts`: `computePlanApply(..., handoff)` sets `vehicle`, `payload`, `dest`, `fleet_refs`; without a handoff it keeps today's result.
- `src/lib/plan/destinations.test.ts`: every id in exactly one group, 22 in all; the derived flat list equals today's set.
- `src/lib/fly/journey-markers.test.ts` (new): positions for a mission with and without a descent profile; ascent beats inside `[0, seam]`; the declutter rule at 390 and 1440 px.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `plan-to-fly.spec.ts`: on `/plan?dest=mars` choose Falcon Heavy, pick a cell, click FLY MISSION; the URL carries `rocket=falcon-heavy`; the HUD vehicle row reads "Falcon Heavy" and the opening card's payload stat "Generic spacecraft · 6065 kg"; the opening card's launch button starts the ascent (the master clock leaves `launchT = -12`); `window.__flyLaunchT` hook still works; the bar shows ascent markers during the launch.
2. Same spec: `/fly?dest=jupiter&type=flyby&dep=9900&tof=900&rocket=sls-block-1&launch=1` starts the launch without a click.
3. Same spec: `/fly?dest=europa&...` does not show the demo scenario (title, trajectory), per Decision 4.
4. `plan.spec.ts`: the destination `select` has five `optgroup`s and 22 options; a click through to `/fly` keeps passing.
5. `a11y.spec.ts`: `/plan` and `/fly` plan flight, 0 serious (marker buttons have unique names).
6. `fly-iconic-peakhold.spec.ts` and the phase-marker specs keep passing: the `milestone-track` test id and the `aria-label` format stay.

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-plan-to-fly-handoff-and-the-journey-bar.md`; 037 is the last at HEAD and the F briefs are being written: take the next free at build time): the handoff contract, the grouped destinations, the one marker row; row in `docs/uxs/decisions/README.md`; row G1 in `docs/uxs/CHANGE-INVENTORY.md` (line 92); close PL1 to PL3 and FY3.
- `docs/adr/ADR-026.md` line 46-48 "FLY-button experience": amend the URL it describes (`/fly?dest&type&dep&tof&rocket`, no mission id) and the rocket handoff; ADR-086 (moon destinations on `/fly`) one line if Decision 4 (a).
- `docs/uxs/UXS-002.md` (the destination control, the FLY button and what it sends), `docs/uxs/UXS-003.md` (the bar: markers, ascent and descent slices), `docs/uxs/IA.md` url-structure (`/fly?dest=...&rocket=...`, line 185) and the Fly row (`/fly?mission=[id]`, line 84).
- `docs/concept/05_Design_System.md` §5.12 (HUD: the play bar's marker row) and the select-with-groups rule (one line).
- `docs/adr/TA.md`: the `/plan` row (line 84) and the Launch / powered ascent paragraph (plan flights now launch); `src/lib/plan/README.md` if one exists (`ls src/lib/plan` shows none: a README row in `src/lib/README.md` otherwise).
- `docs/rfc/RFC-034.md` §11.3 one line: the transition seam applies to plan flights.

## 10. Phased plan

1. **G1a the registry guard and the handoff module:** `resolveLauncher` guard + tests red first, `rocket-handoff.ts` + tests, `computePlanApply*` extension, `/plan` writes and `/fly` reads `rocket=`. The HUD and opening card show the vehicle and payload.
2. **G1b the launch:** the `?launch=1` guard, `mission.dest` for plan flights, the e2e that starts a launch from a plan click; the moon destinations (Decision 4).
3. **G1c destinations grouped:** `PLAN_DESTINATION_GROUPS`, the `select`, 70 strings, the e2e.
4. **G1d the journey bar:** `journey-markers.ts`, the row on the bar in the launch and descent, the tooltips, declutter; shots; docs of §9; `npm run preflight` once before a push, `npm run preflight:coverage` (new pure modules).

## 11. Acceptance checks

- A Plan click for each of the 13 rockets reaches `/fly` with that vehicle name and a payload line; none shows a dash.
- The launch starts from the opening card and from `?launch=1` for a plan flight to Mars, the Moon and Jupiter; the ascent shows the right vehicle model and profile tier; no dead button (a unit test and an e2e).
- Europa, Titan and Triton plan flights do not land on the demo scenario.
- The destination `select` shows five groups and 22 options; the body panels' "Plan mission" chip still opens `/plan?dest=<id>`.
- The bar shows ascent beats during the launch, cruise ticks in the cruise and descent beats in the descent (for a mission with one), on all three projects; no horizontal scroll at 390.
- Docs of §9 updated; the inventory row G1 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the three G briefs)

1. **How Fly learns the rocket.** **(a) `rocket=<rockets.json id>` on `/fly`, written by Plan (and by Plan into its own URL, so a reload keeps the pick), read by Fly and turned into vehicle, launcher ref, dest and payload by one pure function** (recommended: Plan already reads that id from the Lab; one id, one table, testable); (b) send the launcher's fleet id as `vehicle=` and let Fly look up the rest (leaks the registry's naming into URLs, three of the 13 ids differ); (c) mint a synthetic `mission=plan-...` id (the opening, gallery and descent code key on mission ids and would try to load files for it).
2. **The default payload.** **(a) The generic spacecraft the ascent already draws, labelled "Generic spacecraft · N kg" with N the mass the ascent integrates (`profile.payloadKg`)** (recommended: the label then matches what the physics flew; no new model, no new art); (b) N is the rocket's published TMI capacity (`payload_to_mars_kg`; honest for Mars, wrong for a Moon or Jupiter trip, and differs from the integrated mass by 2x for Falcon Heavy); (c) a per-destination craft (a Mars lander, a probe) from the fleet set (more art and a mapping table to maintain).
3. **Launch for a plan flight.** **(a) The opening card gets the launch button it already draws (now working) and `?launch=1` works; arriving from Plan still opens on the opening card, as missions do** (recommended: the same behaviour as every other mission, the operator asked for "the option as for other missions"); (b) Plan's FLY button starts the launch directly (skips the opening card and its story; a plan flight has little story, but the card is where the choice to skip lives); (c) only the button.
4. **The nine moon destinations on `/fly`.** **(a) Fly the host planet's arc (the porkchop is already on the host's axes) with the moon named as the target ("EARTH → EUROPA via JUPITER"), the moon drawn and labelled by G2** (recommended: smallest honest flight; no new trajectory model); (b) disable FLY MISSION for the nine with a one-line reason until Fly can draw them (safe, removes 9 of 22 from the feature); (c) build the multi-leg flight (host flyby then moon capture): a larger arc than G1 to G3 together.
5. **Descent beats for a plan flight.** **(a) Leave: a plan LANDING flight ends at arrival; descent beats appear on the bar only for the 37 + 7 missions that have a profile** (recommended: descent profiles are keyed by mission id; a generic Moon, Mars or Venus descent archetype for plan flights is a separate slice); (b) a generic descent for Mars, Moon and Venus plan flights now (profile registry fallback + descent scene for an id that has none); (c) none, ever, for plan flights.
6. **The groups, their names and the edge cases.** **(a) Five groups: "Inner system" (Moon, Mercury, Venus, Mars, Phobos, Deimos), "Asteroids" (Vesta, Ceres, Psyche, Bennu), "Jupiter system", "Saturn system", "Outer system" (Uranus, Neptune, Triton, Pluto)** (recommended: no group over six rows; the operator's four names with Jupiter and Saturn kept apart; Ceres and Bennu sit with the asteroids as the plan lists them, Pluto with the outer system); (b) four groups, Jupiter and Saturn merged into "Giant planet systems" (eight rows, one group fewer); (c) a dwarf-planet group for Ceres and Pluto (a sixth group of two rows).
7. **The control.** **(a) Keep the native `select`, add `optgroup`s** (recommended: free accessibility, the phone's own picker, the Lab does it; no new component); (b) grouped chips (five chip rows, a second level of choice before the destination: more taps, and the porkchop is the focus of the page); (c) a custom listbox popover (the most work and the least accessible).
8. **Which markers, in which style.** **(a) One row for the whole journey: ascent beats, cruise milestones and FD stages, descent beats; 2 px ticks, a hover and focus label, a click seeks there; collapse markers closer than 10 px with a count** (recommended: one rule for every flight; the bar's ascent slice is narrow, so declutter is part of the design); (b) only phase boundaries (launch, cruise, arrival, landing: four ticks) with the detail in the HUD strips (calm, but loses the beats the operator asked to see); (c) everything as labelled flags above the bar (clutter on a phone).
9. **Marker label language.** **(a) The tick label is `hudLabel(beat)`, the same translated text the FLIGHT PLAN list shows, plus one new accessible-name template (`fly_beat_aria`, 14 locales)** (recommended: the labels already exist in 14 locales and the bar and the list then read identically; flight-dynamics acronyms stay as they are in every locale); (b) a shorter label set for the bar (STAGE SEP to SEP, ...) with new keys in 14 locales (shorter on a phone, 5 or 6 new strings × 14, and two spellings of one beat); (c) icon-only ticks with no text (no language question, but the beat is no longer named).

## 13. NOT VERIFIED

- NV1 Browser results (§2.7) are what a headless Chromium with software GL showed at one moment: the HUD text, the buttons present, the marker counts, and one click per page. The click on a plan flight was made once with an 8 s wait; that no launch scene mounted agrees with the code reading in §2.4, but it was not repeated and the console was not read for a swallowed error. Frame time in the shots was 124 to 164 ms (the page's own PERFORMANCE card), so timing-based expectations were not tested. The shot of the first run at 2.5 s caught the demo scenario before the plan flight replaced it (§2.7 last bullet); whether that flash is wanted was not looked at.
- NV2 That a plan flight with a vehicle and `fleet_refs` launches cleanly end to end (the warp into the cruise at the plan's `dep_day`, the injection beat for `dest` MARS or JUPITER, the cislunar hand-in for the Moon) was not run. The reducer inputs (`launchAvailable`, `isMoonMission`) were read, not exercised with a plan flight.
- NV3 The track width was measured at 1440×900 (1,109 px) and on a touch-emulated 390×844 (216 px, one speed slot) in the opening state; on a non-touch 390 px viewport the four speed chips stay and the track is 59 px (a first run without touch emulation: not a real phone). 844×390 and the track width during a launch were not measured; the declutter threshold (10 px) is a proposal. At 216 px the ascent slice is 32 px: six beats cannot show as separate ticks, which is why Decision 8 needs the declutter rule.
- NV4 `ariane-6` has a model (`buildAriane6`) and a fleet entry but no launch profile; Vulcan has a model and a fleet entry but is not a `/plan` rocket. Whether the generic 6,000 kg profile reaches orbit for Ariane 6's plan range was not run.
- NV5 Whether the nine moon destinations' `dep`/`tof` (host-planet axes) fly the intended arc when sent to the host planet's branch of `applyPlanSelection` was derived from the constants file's comment and the `dest` handling, not run.
- NV6 The destination `select`'s width and the longest group label in 14 locales (Hindi, German, Russian, Arabic) were not measured.
- NV7 `ADR-026` and `ADR-086` were read for the handoff only; whether either calls the `/fly` URL a public contract (shared links in the wild carry `dest/type/dep/tof`) was not checked. The proposal adds a parameter and removes none.
- NV8 No test and no preflight was run: this brief changed no code.
