/**
 * Generate hybrid (Tier 1.5) heliocentric waypoints from an existing
 * Tier 1 Mars/outer-system mission profile (#107 Step 6d).
 *
 *   npx tsx scripts/cislunar/generate-helio-hybrid-waypoints.ts \
 *     static/data/missions/mars/tianwen1.json
 *
 * Mirrors the Moon-side generate-hybrid-waypoints.ts script but for
 * interplanetary trajectories: reads departure_date + arrival_date +
 * flight.events[].met_days, builds the parametric transfer ellipse via
 * buildInterplanetaryTrajectory(), resamples to 100 MET-evenly-spaced
 * waypoints, pins event-MET anchors to slot indices, writes back to
 * flight.interplanetary_profile.waypoints_helio_au + flips
 * source_tier to tier_1_5_hybrid.
 *
 * Coordinate system: heliocentric ecliptic J2000, units AU.
 *   waypoint = [met_days, x_au, y_au, z_au]
 * For in-plane transfers (all our missions today) y_au = 0.
 *
 * Why tier_1_5_hybrid and not tier_2_published:
 *   The transfer ellipse is generated from canonical orbital constants
 *   + the mission's published departure_date + arrival_date — that's
 *   real timing data, but the resulting trajectory shape is analytic.
 *   tier_2_published is reserved for direct ingest from JPL Horizons /
 *   ESA SPICE state-vector tables.
 *
 * Idempotent: re-running on the same mission produces identical
 * waypoints (subject to JS number serialization).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  buildInterplanetaryTrajectory,
  type InterplanetaryPhase,
  type InterplanetaryProfile,
  type Vec3Au,
} from '../../src/lib/interplanetary-geometry.ts';
import type { DestinationId } from '../../src/lib/physics/transfer/lambert-grid.constants.ts';

const TARGET_WAYPOINTS = 100;

interface MissionJson {
  id: string;
  dest?: string;
  transit_days?: number;
  departure_date?: string;
  arrival_date?: string;
  flight?: {
    events?: Array<{ type: string; met_days?: number }>;
    cruise?: { tcm_count?: number };
    arrival?: { v_infinity_km_s?: number };
    interplanetary_profile?: InterplanetaryProfile;
  };
}

const file = process.argv[2];
if (!file) {
  console.error('usage: generate-helio-hybrid-waypoints.ts <path-to-mission-json>');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');
const json = JSON.parse(raw) as MissionJson;
const flight = json.flight ?? {};
if (!flight.interplanetary_profile) {
  // Seed an empty profile with sensible defaults derived from dest.
  const arrivalBody = (json.dest ?? 'mars').toLowerCase() as DestinationId;
  flight.interplanetary_profile = {
    source_tier: 'tier_1_analytic',
    reference_frame: 'heliocentric_ecliptic_J2000',
    departure_body: 'earth',
    arrival_body: arrivalBody,
    transfer_type: 'type1_lambert',
    tcm_count: flight.cruise?.tcm_count,
  };
  json.flight = flight;
}

const transitDays = json.transit_days;
if (typeof transitDays !== 'number' || transitDays <= 0) {
  console.error(`${file}: missing or invalid transit_days`);
  process.exit(1);
}

// dep_day_sim: the mission's epoch on the orrery sim-day axis. We
// match historical-mars-arcs.ts conventions:
//   sim-day 0 = 2026-01-01; depDay = days since that epoch.
const SIM_EPOCH_MS = new Date(2026, 0, 1).getTime();
const MS_PER_DAY = 86_400_000;
const depDaySim = json.departure_date
  ? Math.round((new Date(json.departure_date).getTime() - SIM_EPOCH_MS) / MS_PER_DAY)
  : 0;

const isReturnTrip = false; // Mars / outer-system missions are predominantly one-way today

// Build the analytic Tier 1 trajectory.
const trajectory = buildInterplanetaryTrajectory(flight.interplanetary_profile, {
  dep_day_sim: depDaySim,
  transit_days: transitDays,
  is_return_trip: isReturnTrip,
  arrival_vinf_kms: flight.arrival?.v_infinity_km_s ?? null,
});

// Flatten phases into a single (met, point) timeline.
const timeline: Array<{ met: number; pt: Vec3Au }> = [];
for (const phase of trajectory.phases) {
  const { start_met_days, end_met_days, points } = phase as InterplanetaryPhase;
  if (points.length === 0) continue;
  const span = end_met_days - start_met_days;
  for (let i = 0; i < points.length; i++) {
    const tFrac = points.length === 1 ? 0 : i / (points.length - 1);
    const met = start_met_days + tFrac * span;
    timeline.push({ met, pt: points[i] });
  }
}
if (timeline.length < 2) {
  console.error(`${file}: trajectory has insufficient points`);
  process.exit(1);
}

// Build sample interpolator over the timeline (mirror of the cislunar
// generator's interpAt — linear between bracketing samples).
function interpAt(met: number): Vec3Au {
  let lo = 0;
  let hi = timeline.length - 1;
  if (met <= timeline[0].met) return timeline[0].pt;
  if (met >= timeline[hi].met) return timeline[hi].pt;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].met <= met) lo = mid;
    else hi = mid;
  }
  const a = timeline[lo];
  const b = timeline[hi];
  const span = b.met - a.met;
  const f = span <= 0 ? 0 : (met - a.met) / span;
  return {
    x: a.pt.x + (b.pt.x - a.pt.x) * f,
    y: a.pt.y + (b.pt.y - a.pt.y) * f,
    z: a.pt.z + (b.pt.z - a.pt.z) * f,
  };
}

// Mission window: parallels the Moon-side logic — max of transit ×
// multiplier and latest event MET × 1.05.
const transitWindow = transitDays * (isReturnTrip ? 2 : 1);
const latestEventMet = (flight.events ?? [])
  .map((e) => e.met_days)
  .filter((v): v is number => typeof v === 'number')
  .reduce((max, v) => (v > max ? v : max), 0);
const missionEndMet = Math.max(transitWindow, latestEventMet * 1.05);

// Build target METs.
const targetMets: number[] = [];
for (let i = 0; i < TARGET_WAYPOINTS; i++) {
  targetMets.push((i / (TARGET_WAYPOINTS - 1)) * missionEndMet);
}
targetMets[0] = 0;
targetMets[TARGET_WAYPOINTS - 1] = missionEndMet;

// Pin event-MET anchors to the nearest slot index.
const eventMets = (flight.events ?? []).filter(
  (e): e is { type: string; met_days: number } => typeof e.met_days === 'number',
);
for (const e of eventMets) {
  if (e.met_days > missionEndMet * 1.05) continue;
  if (e.met_days < 0) continue;
  const idealSlot = Math.round((e.met_days / missionEndMet) * (TARGET_WAYPOINTS - 1));
  if (idealSlot >= 1 && idealSlot <= TARGET_WAYPOINTS - 2) {
    targetMets[idealSlot] = e.met_days;
  }
}

// Ensure strictly increasing METs.
for (let i = 1; i < targetMets.length; i++) {
  if (targetMets[i] <= targetMets[i - 1]) {
    targetMets[i] = targetMets[i - 1] + 1e-4;
  }
}

// Sample.
const waypoints: Array<[number, number, number, number]> = targetMets.map((met) => {
  const pt = interpAt(met);
  // Round AU to 6 decimal places — ~150m precision in heliocentric
  // distance, way past what the parametric inputs warrant.
  return [
    Math.round(met * 10000) / 10000,
    Math.round(pt.x * 1e6) / 1e6,
    Math.round(pt.y * 1e6) / 1e6,
    Math.round(pt.z * 1e6) / 1e6,
  ];
});

// Stamp the JSON.
flight.interplanetary_profile.source_tier = 'tier_1_5_hybrid';
flight.interplanetary_profile.waypoints_helio_au = waypoints;

writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(
  `${file}: wrote ${waypoints.length} helio waypoints (MET 0..${missionEndMet}d, ${eventMets.length} event anchors pinned)`,
);
