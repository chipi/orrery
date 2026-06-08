# Mission trajectories — operator guide

Companion to [ADR-058](../adr/ADR-058.md). Covers how to add a new mission's trajectory waypoints + phase markers + science chips to `/fly`. The same toolchain applies to Moon (cislunar) + Mars + outer-system (heliocentric) missions.

---

## Quick reference

| Mission destination | Schema field | Generator script | Coordinate system |
|---|---|---|---|
| Moon | `flight.cislunar_profile.waypoints_km` | `scripts/cislunar/generate-hybrid-waypoints.ts` | ECI km |
| Mars + outer-system | `flight.interplanetary_profile.waypoints_helio_au` | `scripts/cislunar/generate-helio-hybrid-waypoints.ts` | Heliocentric AU |

Both ship at **`source_tier: tier_1_5_hybrid`** by default — analytic curve resampled to 100 waypoints with event-MET anchors pinned to slot indices. `tier_2_published` is reserved for direct NASA TND / ESA SPICE ingest (future slice).

---

## Adding a new mission

Assuming the mission's JSON is at `static/data/missions/<dest>/<slug>.json` with `flight.events[]` and either `flight.cislunar_profile` (Moon) or `flight.interplanetary_profile` (Mars / outer) populated at least with parametric defaults.

### Moon mission

```sh
npx tsx scripts/cislunar/generate-hybrid-waypoints.ts static/data/missions/moon/<slug>.json
```

The generator:
1. Reads `flight.cislunar_profile` parametric fields + `flight.events[].met_days`.
2. Calls `buildCislunarTrajectory()` (same path the renderer uses).
3. Resamples to 100 MET-evenly-spaced waypoints across the mission window. Window = max(`transit_days × multiplier`, `latest_event_met × 1.05`); multiplier is 2 when `cislunar_profile.return.type != 'none'`, else 1.
4. Pins event-MET anchors to nearest slot indices (so the phase markers land exactly at published METs).
5. Writes `waypoints_km` + flips `source_tier` to `tier_1_5_hybrid`.

### Mars / outer-system mission

```sh
npx tsx scripts/cislunar/generate-helio-hybrid-waypoints.ts static/data/missions/<mars|ceres|jupiter|neptune|pluto>/<slug>.json
```

Same pattern but for heliocentric AU coords. Reads `departure_date` + `arrival_date` (top-level), `transit_days`, and `flight.events[]`. Builds a transfer ellipse via `transferEllipse()` from `mission-arc.ts`, samples to 100 points, pins event METs. Writes `waypoints_helio_au` (units: AU, with `y = 0` for in-plane transfers, which covers all current missions). Flips `source_tier` to `tier_1_5_hybrid`.

### Verification

```sh
npm run validate-data
```

The waypoint validators (`checkCislunarWaypoints` + `checkInterplanetaryWaypoints` in `scripts/validate-data.ts`) enforce:
- `waypoints[0].met_days == 0` (launch anchor)
- Strictly-increasing METs
- Mission window cap
- 200-waypoint hard cap
- Heliocentric radius sanity (0.1–50 AU)

For visual spot-check, run `npm run preview` and open `/fly?mission=<slug>`. Phase markers should render on the trajectory in both 3D and 2D views, with science chips on the HUD phase pill.

---

## Edge cases

### Missions whose timeline extends past `transit_days`

Some missions have events past the nominal outbound transit (Apollo 13's return after the anomaly; Apollo 17's lunar surface stay; Beresheet's late-impact anomaly; Voyager 2's outer-planet flybys). The generator's window calc handles this — `latest_event_met × 1.05` overrides `transit_days × multiplier` when the events extend further. The validator allows up to `latest_event_met × 1.1`.

### Mission without a published trajectory shape

For speculative / planned missions with `transit_days` + dates but no event timeline yet, leave the trajectory at `tier_1_analytic` — `/fly` will still render the parametric path via `buildCislunarTrajectory()` / `buildInterplanetaryTrajectory()` directly. Examples currently at `tier_1_analytic`: `starship-demo`, `starship-mars-crew` (0-event speculative Mars missions).

### Truncated trajectories (impacts, anomalies)

Beresheet ends with an `anomaly` event at MET 48.01d (impact on the Moon). The generator includes events beyond `transit_days` cleanly because of the window-extension rule; the renderer linearly interpolates waypoints, so the trajectory visually terminates at the last waypoint. The phase-marker reveal state machine flags any event with `met_days > simDay` as `ghosted`.

### Sample-return missions

**Moon (`cislunar_profile.return.type`):** Set to one of:
- `none` (default — one-way; flyby missions, impactors, orbiters that stay)
- `tei_direct` (direct Trans-Earth Injection)
- `tei_lor` (Lunar Orbit Rendezvous on return)

The generator multiplies the transit window by 2 to cover both outbound + return. Examples: Apollo 11/13/17, Chang'e 5/6, Artemis 2, sample-return Luna missions.

**Mars + outer-system (`interplanetary_profile.return.type`):** Same shape, different enum:
- `none` (default — every current Mars + outer-system mission)
- `tei_helio_direct` (direct heliocentric Trans-Earth Injection)
- `tei_helio_lor` (LOR-pattern adapted to interplanetary range)

Example: MMX (JAXA Mars/Phobos sample return, 2026) is planned as sample-return; when its event timeline is backfilled with `earth_return`, set `interplanetary_profile.return.type = "tei_helio_direct"` so /fly renders both legs.

### Outer-system missions (Galileo, Voyager 2, New Horizons, Dawn)

Outer-system missions use the same `interplanetary_profile` schema as Mars. Differences worth knowing:

- **Multiple flybys past target body.** Voyager 2 (Grand Tour: Jupiter → Saturn → Uranus → Neptune) and Galileo (Venus + 2× Earth + 2× asteroid gravity assists before Jupiter arrival) have events extending well past `transit_days` (Voyager 2: 4607d events vs 4388d transit). The window-extension rule covers this automatically.
- **No descent / EDL.** Most outer-system missions are flybys or orbit-only — the cislunar `descent` / `ascent` / `edl` event types don't apply. Use `flyby`, `arrival`, `edl_or_oi` (for atmospheric probes like Galileo's Jupiter probe) as appropriate.
- **arrival_body enum.** Set to one of `ceres`, `jupiter`, `neptune`, `pluto`. The generator's `destinationPos()` provides the correct heliocentric position at arrival; Mars-specific `marsPos()` is bypassed.
- **No sample-return.** All current outer-system missions are one-way; leave `return.type` absent.

---

## Phase types + science map

The science cross-links on the HUD phase pill + per-event marker chips are configured in `static/data/cislunar-phase-science-map.json`. Two key sections:

- `phase_refs`: maps `CislunarPhaseType` (10 cislunar) + `InterplanetaryPhaseType` (11 heliocentric) to `/science/<tab>/<slug>` references.
- `event_refs`: maps `FlightEventType` (14 event types) to `/science/<tab>/<slug>` references.

A reference takes the form `[{ "tab": "mission-phases", "slug": "trans-x-injection" }, ...]` — first entry is the primary chip, additional entries appear in the panel's expanded view.

When adding a new event or phase type:
1. Update the schema's `FlightEventType` / phase enums (`src/types/mission.ts` + `static/data/schemas/mission.schema.json`).
2. Add a `phase_refs` or `event_refs` entry pointing at an existing `/science/<tab>/<slug>.json` page. Run `npx tsx scripts/cislunar/check-science-map-refs.ts` to verify it resolves.
3. Add an i18n label in `messages/en-US.json` (`fly_event_<type>` for events). Mirror to all 14 locales (uppercase aerospace shorthand convention — same EN string across non-EN locales).
4. Extend the `defaultEventLabel()` switch in `src/routes/fly/+page.svelte`.

---

## Scrubber UX (#107 Step 6g)

Phase marker dots are clickable buttons that jump the sim to that event's MET. Driven by:

- `PhaseMarkerLabel.svelte` props: `onJump: () => void` + `eventMetDays: number`.
- `/fly`'s `jumpToMet(metDays)` handler sets `simDay = depDay + met`, pauses sim.

Keyboard-focusable; aria-label includes the MET ("LOI at MET 3.13 days. Click to jump."). Reduced-motion: snap, no animation.

---

## Real NASA TND state-vector ingest (`tier_2_published`)

Currently deferred to v0.8+ (tracked as **[GH #262](https://github.com/chipi/orrery/issues/262)**). When implemented, the ingest path will:

- Read NASA Mission Report PDFs (Apollo 11 MSC-00171, Apollo 13 MSC-02680, Apollo 17 JSC-07904, Artemis II post-flight reconstruction).
- Parse the state-vector tables (each Mission Report has its own table format — per-mission adapter).
- Emit `waypoints_km` directly with `source_tier: tier_2_published`.
- Visual delta vs. the `tier_1_5_hybrid` curve should be within a few percent (geometry is already faithful to first-order).

The reserved tier label exists in the schema enums today; only the ingest path is open. Same shape applies to a future Mars / outer-system `tier_2_published` path via JPL Horizons or ESA SPICE state-vector kernels.

---

*Orrery · mission-trajectories.md · #107 Step 6 — May 2026*
