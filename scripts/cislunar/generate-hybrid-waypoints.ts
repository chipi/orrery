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
import { phaseTimeFractions } from '../../src/lib/orbital/sample-cislunar-spacecraft.ts';
import { lambertArc } from './kepler-arc.ts';

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

// Flatten phases into a single (met, point) timeline. Each coast is redrawn as the Earth-centred
// conic joining its end points in the flown time (lambertArc), sampled evenly in time. The
// analytic coast shapes take about five days by their own Kepler timing; squeezed into a flown
// 2.5-day trip home the craft dawdled at the Moon and raced past Earth. Other phases (and a coast
// with no such conic) keep their points, timed by Kepler's second law (phaseTimeFractions).
const COAST_SAMPLES = 80;
const DAY_S = 86400;
const coastArc = (phase: CislunarPhase) => {
  if (phase.type !== 'tli_coast' && phase.type !== 'tei_coast') return null;
  const { points, start_met_days, end_met_days } = phase;
  if (points.length < 2) return null;
  const tofS = (end_met_days - start_met_days) * DAY_S;
  // buildFromWaypoints starts the drawn trip home at the Moon where it is at TEI; a free return's
  // analytic coast starts at its exit point instead (Artemis II: 40,000 km out), and a conic from
  // there met the drawn start at a 44-degree corner.
  const from = phase.type === 'tei_coast' ? moonEciPos(start_met_days) : points[0];
  const at = lambertArc(from, points[points.length - 1], tofS, MU_EARTH_KM3_S2);
  if (!at) {
    console.warn(`${file}: no conic for ${phase.type}; keeping the analytic shape`);
    return null;
  }
  const arc = Array.from({ length: COAST_SAMPLES + 1 }, (_, k) => at((tofS * k) / COAST_SAMPLES));
  // A slow transfer (weeks of phasing loops, Chang'e 4 or Beresheet) has no single conic that
  // stays inside the Moon's distance: one in its time climbs far past the Moon and back.
  const r = (p: Vec3Km) => Math.hypot(p.x, p.y, p.z);
  const ceiling = 1.05 * Math.max(r(from), r(points[points.length - 1]));
  if (arc.some((p) => r(p) > ceiling)) {
    console.warn(`${file}: ${phase.type}'s conic climbs past its ends; keeping the analytic shape`);
    return null;
  }
  return arc;
};
const timeline: Array<{ met: number; pt: Vec3Km }> = [];
for (const phase of trajectory.phases) {
  const { start_met_days, end_met_days } = phase as CislunarPhase;
  const arc = coastArc(phase as CislunarPhase);
  const points = arc ?? (phase as CislunarPhase).points;
  if (points.length === 0) continue;
  const span = end_met_days - start_met_days;
  const fracs = arc
    ? arc.map((_, k) => k / COAST_SAMPLES)
    : phaseTimeFractions(phase as CislunarPhase);
  for (let i = 0; i < points.length; i++) {
    const tFrac = fracs[i];
    const met = start_met_days + tFrac * span;
    // A phase boundary repeats the prior entry's MET. The same point is skipped; a different one
    // (the trip home leaves the Moon where it is at TEI, the stay is held on the arrival-day
    // Moon) is kept a moment later, or the jump between the two Moons is spread over the
    // coast's first step and sampled as a path no craft flew.
    const prev = timeline[timeline.length - 1];
    if (prev && Math.abs(met - prev.met) < 1e-9) {
      const p = points[i];
      if (Math.hypot(p.x - prev.pt.x, p.y - prev.pt.y, p.z - prev.pt.z) < 1) continue;
      timeline.push({ met: met + 1e-4, pt: p });
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
// (e.g. two close events both pinned). Then drop any equal-MET slot (validator requires strictly
// increasing). Nudged 1e-4 d apart instead, splashdown (an event and the last slot) came out
// twice at the same place, and that zero-length step turned off the renderer's Kepler timing.
targetMets.sort((a, b) => a - b);
for (let i = targetMets.length - 1; i > 0; i--) {
  if (targetMets[i] <= targetMets[i - 1] + 1e-9) targetMets.splice(i, 1);
}

// Evenly spaced in time, the fast pass near Earth gets few samples and the drawn path corners
// there (the trip home turned 60 degrees between samples). Add time midpoints wherever the path
// turns more than MAX_TURN_DEG between neighbours, within validate-data's 200-entry cap.
const MAX_TURN_DEG = 15;
const MAX_WAYPOINTS = 190;
const turnDeg = (a: Vec3Km, b: Vec3Km, c: Vec3Km): number => {
  const u = [b.x - a.x, b.y - a.y, b.z - a.z];
  const v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const lu = Math.hypot(u[0], u[1], u[2]);
  const lv = Math.hypot(v[0], v[1], v[2]);
  if (lu < 1 || lv < 1) return 0;
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};
// Only segments inside a coast: a lunar orbit sampled every couple of hours turns sharply by
// nature, and the step from the stay (held on the arrival-day Moon) to the trip home (on the
// Moon where it is at TEI) is a jump the renderer bridges; halving it drew samples between the
// two Moons, which buildFromWaypoints cuts off as an unflyable climb.
const coastSpans = trajectory.phases
  .filter((p) => p.type === 'tli_coast' || p.type === 'tei_coast')
  .map((p) => [p.start_met_days, p.end_met_days] as const);
const segInCoast = (m0: number, m1: number) =>
  coastSpans.some(([a, b]) => m0 > a + 1e-9 && m1 <= b + 1e-9);
for (let pass = 0; pass < 8 && targetMets.length < MAX_WAYPOINTS; pass++) {
  const pts = targetMets.map(interpAt);
  const split = new Set<number>();
  for (let i = 1; i < pts.length - 1; i++) {
    if (!segInCoast(targetMets[i - 1], targetMets[i])) continue;
    if (!segInCoast(targetMets[i], targetMets[i + 1])) continue;
    if (turnDeg(pts[i - 1], pts[i], pts[i + 1]) <= MAX_TURN_DEG) continue;
    split.add(i - 1);
    split.add(i);
  }
  if (split.size === 0) break;
  const next: number[] = [];
  for (let i = 0; i < targetMets.length; i++) {
    next.push(targetMets[i]);
    const room = MAX_WAYPOINTS - (next.length + (targetMets.length - 1 - i));
    if (split.has(i) && i + 1 < targetMets.length && room > 0)
      next.push((targetMets[i] + targetMets[i + 1]) / 2);
  }
  targetMets.splice(0, targetMets.length, ...next);
}

// buildFromWaypoints reads 3+ consecutive samples beyond 300,000 km that sit within 5,000 km of
// each other (per axis) as a stay at the Moon. A coast near the Moon moves about 1 km/s, so
// samples a couple of hours apart there read as a stay that was never flown. Keep consecutive
// coast samples out there at least HOLD_CLEAR_KM apart (more than 5,000 km on some axis under
// any turn about the pole), dropping all but the event anchors.
const HOLD_CLEAR_KM = 9000;
const NEAR_MOON_KM = 300_000;
const anchors = new Set([
  0,
  missionEndMet,
  ...events.map((e) => Math.min(e.met_days, missionEndMet)),
]);
const coastOnly = (met: number) => coastSpans.some(([a, b]) => met > a + 1e-9 && met < b - 1e-9);
{
  const droppable = (met: number) => coastOnly(met) && !anchors.has(met);
  // shortIn: the step into this sample is short. The hold needs two short steps in a row, so a
  // coast keeps a short step when the one before it was long: a craft leaving the Moon turns
  // hard in its first hours (Artemis II), and thinning every short step cornered it there.
  const kept: Array<{ met: number; pt: Vec3Km; shortIn: boolean }> = [];
  const tooClose = (pt: Vec3Km) => {
    const prev = kept[kept.length - 1]?.pt;
    return (
      !!prev &&
      Math.hypot(pt.x, pt.y, pt.z) > NEAR_MOON_KM &&
      Math.hypot(pt.x - prev.x, pt.y - prev.y, pt.z - prev.z) < HOLD_CLEAR_KM
    );
  };
  for (const met of targetMets) {
    const pt = interpAt(met);
    const shortIn = tooClose(pt);
    if (shortIn) {
      if (droppable(met)) {
        if (!kept[kept.length - 1].shortIn) kept.push({ met, pt, shortIn });
        continue;
      }
      // A sample that must stay (an event, or the stay itself) next to the last coast sample:
      // drop that one instead, or the stay starts there (Lunar Reconnaissance Orbiter: half a
      // day before arrival, at the slow far end of its transfer).
      while (tooClose(pt) && droppable(kept[kept.length - 1].met)) kept.pop();
    }
    kept.push({ met, pt, shortIn: tooClose(pt) });
  }
  targetMets.splice(0, targetMets.length, ...kept.map((k) => k.met));
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
flight.cislunar_profile.waypoint_times = 'flown';
flight.cislunar_profile.waypoints_km = waypoints;

writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(
  `${file}: wrote ${waypoints.length} waypoints (MET 0..${missionEndMet}d, ${events.length} event anchors pinned)`,
);

function authoredFromOrbitTables(): void {
  const profile = flight!.cislunar_profile!;
  const raising = profile.orbit_raising ?? [];
  const lunar = profile.lunar_orbits ?? [];
  const evs = cislunarEventTimes(flight!.events);
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
