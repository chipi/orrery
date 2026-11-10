/**
 * Generate hybrid (Tier 1.5) cislunar waypoints from an existing Tier 1
 * mission profile (GH #107).
 *
 *   npx tsx scripts/cislunar/generate-hybrid-waypoints.ts \
 *     static/data/missions/moon/apollo11.json
 *
 * What it does:
 *   1. Reads the mission JSON's existing `flight.cislunar_profile`
 *      (parametric Tier 1) + `flight.events[]` MET timestamps.
 *   2. Calls `buildCislunarTrajectory` (same path the renderer uses)
 *      to produce phase-segmented ECI points.
 *   3. Resamples to 100 MET-evenly-spaced waypoints across the mission
 *      timeline (0 .. transit_days × 2 for round-trip, × 1 one-way).
 *   4. Pins event-MET anchors to exact waypoint indices via slot
 *      rounding so the trajectory marker indices align with
 *      `flight.events[].met_days` values to within ~0.04 days
 *      (1 / 100 × 4 = ~57 minutes per slot for Apollo 11).
 *   5. Writes the result back to `cislunar_profile.waypoints_km` and
 *      flips `source_tier` to `tier_1_5_hybrid`.
 *
 * Why tier_1_5_hybrid (and NOT tier_2_published):
 *   The parametric values in the mission JSON (parking_orbit.altitude_km,
 *   tli.dv_kms, lunar_arrival.periselene_km, etc.) ARE NASA-published
 *   reality from MSC-00171 / equivalent Mission Reports — already
 *   sourced in the file. The cislunar-geometry primitives produce
 *   real-shape Keplerian arcs from those values. But the output is
 *   still resampled analytic geometry, not real published state vectors.
 *   `tier_2_published` is reserved for direct NASA TND ingest (see
 *   scripts/cislunar/ingest-nasa-tnd.ts when it lands for Apollo 11/13/17
 *   + Artemis II). Freezing as hybrid waypoints gives the renderer + UI:
 *     - Deterministic phase-marker positions (waypoint index N = a
 *       specific event's MET) for the GH #107 marker reveal UX.
 *     - Reproducibility — a code change to a Tier 1 primitive doesn't
 *       silently shift this mission's rendered trajectory.
 *     - Zero per-frame trajectory regen cost.
 *
 * Orbit-raising missions (Chandrayaan-1/-3, SLIM): the resampled Tier 1 spiral ignores the flight's
 * event times and parked these craft at twice the Moon's distance (or at the Earth's centre) for
 * weeks. When the profile carries `orbit_raising` (published [met_days, perigee_km, apogee_km] per
 * burn) and/or `lunar_orbits` (published [met_days, perilune_km, apolune_km] per orbit), the
 * waypoints are built from those tables instead (authoredFromOrbitTables below) and
 * `cislunar_profile.waypoints_source` records where the figures come from. Orbits are drawn in the
 * ecliptic plane with schematic phase; every Earth orbit shares one apse line, the coast leaves the
 * last burn's perigee (or the TLI event, if later) for the Moon's position at lunar arrival, and the
 * stay at the Moon is Moon-centred offsets around the arrival-day Moon with the angle step capped so
 * consecutive samples stay inside buildFromWaypoints' 5,000 km hold tolerance.
 *
 * Idempotent: running twice on the same file produces identical
 * waypoints (subject to JS number serialization). Safe to re-run when
 * the mission's parametric profile is updated.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
  R_MOON_KM,
  moonEciPos,
  buildCislunarTrajectory,
  cislunarEventTimes,
  type CislunarProfile,
  type CislunarPhase,
  type Vec3Km,
} from '../../src/lib/orbital/cislunar/cislunar-geometry.ts';

const TARGET_WAYPOINTS = 100;

interface MissionJson {
  id: string;
  transit_days?: number; // top-level per mission schema
  flight?: {
    events?: Array<{ type: string; met_days?: number }>;
    cislunar_profile?: CislunarProfile;
    arrival?: { type?: string };
  };
}

const file = process.argv[2];
if (!file) {
  console.error('usage: generate-hybrid-waypoints.ts <path-to-mission-json>');
  process.exit(1);
}

const json = JSON.parse(readFileSync(file, 'utf8')) as MissionJson;
const flight = json.flight;
if (!flight?.cislunar_profile) {
  console.error(`${file}: no flight.cislunar_profile — cannot generate Tier 2`);
  process.exit(1);
}
const transitDays = json.transit_days;
if (typeof transitDays !== 'number' || transitDays <= 0) {
  console.error(`${file}: missing or invalid transit_days`);
  process.exit(1);
}

if (flight.cislunar_profile.orbit_raising || flight.cislunar_profile.lunar_orbits) {
  authoredFromOrbitTables();
  process.exit(0);
}

// Round-trip mission window = 2 × transit_days. The cislunar primitives
// allocate the return half across teiCoast + reentry; for one-way
// missions (impactors, flybys) we cap at 1 × transit_days.
// A free return (Apollo 13, Artemis II) has return.type 'none' (no TEI burn) but still comes
// home: a splashdown event makes it a round trip.
const isReturnTrip =
  (flight.cislunar_profile.return?.type !== 'none' && !!flight.cislunar_profile.return?.type) ||
  (flight.events ?? []).some((e) => e.type === 'earth_return');
const transitWindow = transitDays * (isReturnTrip ? 2 : 1);
// Some published timelines extend beyond transit_days × multiplier
// (e.g. Apollo 17 surface stay; Apollo 13 free-return swingby with
// late earth_return event; cancelled-LOI missions). Pad the mission
// window so every event_met_days lands inside the waypoint range —
// add 5% headroom past the last event's MET, since the renderer
// interpolates linearly and we want events to anchor cleanly.
const latestEventMet = (flight.events ?? [])
  .map((e) => e.met_days)
  .filter((v): v is number => typeof v === 'number')
  .reduce((max, v) => (v > max ? v : max), 0);
// A flight that splashes down ends there: sampling past it clamped the last samples back to
// the Moon (a 'teleport' tail on Apollo 11/13, Artemis II/IV/V, Chang'e 5).
const splashdown = (flight.events ?? []).find((e) => e.type === 'earth_return')?.met_days;
const missionEndMet = splashdown ?? Math.max(transitWindow, latestEventMet * 1.05);

// Build the Tier 1 trajectory via the same code path the renderer uses.
// Phase boundaries from the flight's own events (TLI, LOI/landing, TEI, splashdown).
// From the parametric profile, never from waypoints already on file (re-running resampled them).
const trajectory = buildCislunarTrajectory(
  { ...flight.cislunar_profile, waypoints_km: undefined },
  {
    dep_day_sim: 0,
    transit_days: transitDays,
    is_return_trip: isReturnTrip,
    events: cislunarEventTimes(flight.events),
  },
);

// Flatten phases into a single (met, point) timeline. Each phase's
// points span its [start_met_days, end_met_days] linearly.
const timeline: Array<{ met: number; pt: Vec3Km }> = [];
for (const phase of trajectory.phases) {
  const { start_met_days, end_met_days, points } = phase as CislunarPhase;
  if (points.length === 0) continue;
  const span = end_met_days - start_met_days;
  for (let i = 0; i < points.length; i++) {
    const tFrac = points.length === 1 ? 0 : i / (points.length - 1);
    const met = start_met_days + tFrac * span;
    // Skip if it would duplicate the prior entry's MET (phase boundaries).
    if (timeline.length > 0 && Math.abs(met - timeline[timeline.length - 1].met) < 1e-9) {
      continue;
    }
    timeline.push({ met, pt: points[i] });
  }
}
if (timeline.length < 2) {
  console.error(`${file}: trajectory has <2 sample points — cannot sample`);
  process.exit(1);
}

function interpAt(targetMet: number): Vec3Km {
  // Clamp to ends.
  if (targetMet <= timeline[0].met) return timeline[0].pt;
  if (targetMet >= timeline[timeline.length - 1].met) return timeline[timeline.length - 1].pt;
  // Binary search for the bracket.
  let lo = 0;
  let hi = timeline.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].met <= targetMet) lo = mid;
    else hi = mid;
  }
  const a = timeline[lo];
  const b = timeline[hi];
  const span = b.met - a.met;
  const t = span < 1e-9 ? 0 : (targetMet - a.met) / span;
  return {
    x: a.pt.x + (b.pt.x - a.pt.x) * t,
    y: a.pt.y + (b.pt.y - a.pt.y) * t,
    z: a.pt.z + (b.pt.z - a.pt.z) * t,
  };
}

// Build target METs: evenly spaced 0 .. missionEndMet with TARGET_WAYPOINTS slots.
const targetMets: number[] = [];
for (let i = 0; i < TARGET_WAYPOINTS; i++) {
  targetMets.push((i / (TARGET_WAYPOINTS - 1)) * missionEndMet);
}

// Anchor pinning: nudge the nearest target slot to each event's exact
// MET. Anchors that fall within the same slot pick the closer one.
// Always pin slot 0 to MET 0 (launch) and last slot to missionEndMet.
targetMets[0] = 0;
targetMets[TARGET_WAYPOINTS - 1] = missionEndMet;
const events = (flight.events ?? []).filter(
  (e): e is { type: string; met_days: number } => typeof e.met_days === 'number',
);
for (const e of events) {
  if (e.met_days > missionEndMet * 1.05) continue;
  if (e.met_days < 0) continue;
  // Find the closest non-pinned-extreme slot.
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 1; i < TARGET_WAYPOINTS - 1; i++) {
    const d = Math.abs(targetMets[i] - e.met_days);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) targetMets[bestIdx] = Math.min(e.met_days, missionEndMet);
}
// Re-sort just in case anchor pinning produced a tiny out-of-order pair
// (e.g. two close events both pinned). Then dedupe by removing any
// equal-MET slot (validator requires strictly increasing).
targetMets.sort((a, b) => a - b);
for (let i = 1; i < targetMets.length; i++) {
  if (targetMets[i] <= targetMets[i - 1]) {
    targetMets[i] = targetMets[i - 1] + 1e-4;
  }
}

// Sample.
const waypoints: Array<[number, number, number, number]> = targetMets.map((met) => {
  const pt = interpAt(met);
  // Round to 1 km — sub-km precision is meaningless given the
  // parametric inputs are only known to ~few %. Smaller output file.
  return [Math.round(met * 10000) / 10000, Math.round(pt.x), Math.round(pt.y), Math.round(pt.z)];
});

// Stamp the JSON.
flight.cislunar_profile.source_tier = 'tier_1_5_hybrid';
flight.cislunar_profile.waypoints_km = waypoints;

writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(
  `${file}: wrote ${waypoints.length} waypoints (MET 0..${missionEndMet}d, ${events.length} event anchors pinned)`,
);

function authoredFromOrbitTables(): void {
  const profile = flight!.cislunar_profile!;
  const raising = profile.orbit_raising ?? [];
  const lunar = profile.lunar_orbits ?? [];
  const evs = cislunarEventTimes(flight!.events) ?? {};
  const arrival = evs.arrival;
  if (arrival == null || !lunar.length) {
    console.error(`${file}: orbit tables need an arrival event and lunar_orbits`);
    process.exit(1);
  }
  const landing = profile.lunar_arrival?.type === 'orbit_and_land';
  const edl = (flight!.events ?? []).find((e) => e.type === 'edl_or_oi')?.met_days;
  const end = landing && edl != null ? edl : Math.floor(transitDays! * 1.05 * 10) / 10;
  const lastBurn = raising.length ? raising[raising.length - 1][0] : 0;
  const tli = raising.length ? Math.max(evs.tli ?? 0, lastBurn) : 0;
  const perigeeAlt = raising.length
    ? raising[raising.length - 1][1]
    : (profile.parking_orbit?.altitude_km ?? 250);

  const kepler = (e: number, E: number) => E - e * Math.sin(E);
  const rows: Array<[number, number, number, number]> = [];
  const push = (met: number, x: number, z: number) =>
    rows.push([Math.round(met * 10000) / 10000, Math.round(x), 0, Math.round(z)]);
  const moonArr = moonEciPos(arrival);
  const phiPerigee = Math.atan2(moonArr.z, moonArr.x) + Math.PI;
  const at = (r: number, E: number, e: number) => {
    const nu =
      2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    return { x: Math.cos(phiPerigee + nu) * r, z: Math.sin(phiPerigee + nu) * r };
  };

  // Each raising orbit: whole revolutions between burns, 6 samples per revolution.
  raising.forEach(([t0, rpAlt, raAlt], i) => {
    const t1 = i + 1 < raising.length ? raising[i + 1][0] : tli;
    if (t1 <= t0) return;
    const rp = R_EARTH_KM + rpAlt;
    const ra = R_EARTH_KM + raAlt;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const period = (2 * Math.PI * Math.sqrt((a * a * a) / MU_EARTH_KM3_S2)) / 86400;
    const revs = Math.max(1, Math.round((t1 - t0) / period));
    const scale = (t1 - t0) / (revs * period);
    const perRev = 6;
    for (let k = 0; k < revs * perRev; k++) {
      const rev = Math.floor(k / perRev);
      const E = (2 * Math.PI * (k % perRev)) / perRev;
      const t = t0 + (rev * 2 * Math.PI + kepler(e, E)) * (period / (2 * Math.PI)) * scale;
      const p = at(a * (1 - e * Math.cos(E)), E, e);
      push(t, p.x, p.z);
    }
  });

  // Coast: the last burn's perigee out to the Moon's distance at arrival (the last sample is left to
  // the first lunar sample so no two samples share a time).
  {
    const rp = R_EARTH_KM + perigeeAlt;
    const ra = Math.hypot(moonArr.x, moonArr.z);
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const n = 14;
    for (let k = 0; k < n; k++) {
      const E = (Math.PI * k) / n;
      const t = tli + (kepler(e, E) / Math.PI) * (arrival - tli);
      const p = at(a * (1 - e * Math.cos(E)), E, e);
      push(t, p.x, p.z);
    }
  }

  let theta = 0;
  lunar.forEach(([t0, rpAlt, raAlt], i) => {
    const t1 = i + 1 < lunar.length ? lunar[i + 1][0] : end - (landing ? 0.3 : 0);
    const rp = R_MOON_KM + rpAlt;
    const ra = R_MOON_KM + raAlt;
    const p = (2 * rp * ra) / (rp + ra);
    const e = (ra - rp) / (ra + rp);
    const count = Math.max(4, Math.round((t1 - t0) / 0.35));
    for (let k = 0; k < count; k++) {
      const r = p / (1 + e * Math.cos(theta));
      push(
        t0 + ((t1 - t0) * k) / count,
        moonArr.x + Math.cos(theta) * r,
        moonArr.z + Math.sin(theta) * r,
      );
      theta += Math.min(0.5, 3500 / Math.max(r, 1));
    }
  });
  if (landing) {
    for (const [t, alt] of [
      [end - 0.3, 60],
      [end - 0.15, 25],
      [end, 0],
    ] as Array<[number, number]>) {
      const r = R_MOON_KM + alt;
      push(t, moonArr.x + Math.cos(theta) * r, moonArr.z + Math.sin(theta) * r);
      theta += 0.3;
    }
  }

  rows.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < rows.length; i++)
    if (rows[i][0] <= rows[i - 1][0]) rows[i][0] = rows[i - 1][0] + 1e-4;

  flight!.cislunar_profile!.waypoints_km = rows;
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(
    `${file}: wrote ${rows.length} waypoints from orbit tables (MET 0..${rows[rows.length - 1][0]}d)`,
  );
}
