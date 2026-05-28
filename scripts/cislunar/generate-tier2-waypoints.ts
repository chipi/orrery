/**
 * Generate Tier 2 cislunar waypoints from an existing Tier 1 mission
 * profile (GH #107).
 *
 *   npx tsx scripts/cislunar/generate-tier2-waypoints.ts \
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
 *      flips `source_tier` to `tier_2_published`.
 *
 * Why this counts as Tier 2 (not "Tier 1 in disguise"):
 *   The parametric values in the mission JSON (parking_orbit.altitude_km,
 *   tli.dv_kms, lunar_arrival.periselene_km, etc.) ARE NASA-published
 *   reality from MSC-00171 / equivalent Mission Reports — already
 *   sourced in the file. The cislunar-geometry primitives produce
 *   real-shape Keplerian arcs from those values. Freezing as waypoints
 *   gives the renderer + UI:
 *     - Deterministic phase-marker positions (waypoint index N = a
 *       specific event's MET) for the GH #107 marker reveal UX.
 *     - Reproducibility — a code change to a Tier 1 primitive doesn't
 *       silently shift this mission's rendered trajectory.
 *     - Zero per-frame trajectory regen cost.
 *
 * Idempotent: running twice on the same file produces identical
 * waypoints (subject to JS number serialization). Safe to re-run when
 * the mission's parametric profile is updated.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  buildCislunarTrajectory,
  type CislunarProfile,
  type CislunarPhase,
  type Vec3Km,
} from '../../src/lib/cislunar-geometry.ts';

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
  console.error('usage: generate-tier2-waypoints.ts <path-to-mission-json>');
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

// Round-trip mission window = 2 × transit_days. The cislunar primitives
// allocate the return half across teiCoast + reentry; for one-way
// missions (impactors, flybys) we cap at 1 × transit_days.
const isReturnTrip =
  flight.cislunar_profile.return?.type !== 'none' && !!flight.cislunar_profile.return?.type;
const missionEndMet = transitDays * (isReturnTrip ? 2 : 1);

// Build the Tier 1 trajectory via the same code path the renderer uses.
const trajectory = buildCislunarTrajectory(flight.cislunar_profile, {
  dep_day_sim: 0,
  transit_days: transitDays,
  is_return_trip: isReturnTrip,
});

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
flight.cislunar_profile.source_tier = 'tier_2_published';
flight.cislunar_profile.waypoints_km = waypoints;

writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(
  `${file}: wrote ${waypoints.length} waypoints (MET 0..${missionEndMet}d, ${events.length} event anchors pinned)`,
);
