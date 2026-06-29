#!/usr/bin/env tsx
/**
 * All-missions /fly iconic-camera audit.
 *
 * Runs EVERY heliocentric flyby/arrival mission through the same camera
 * math the live scene uses (`planFlybyShot` + `classifyShot`) at each of
 * its flyby / orbit-insertion / arrival events, and records whether the
 * resulting frame is "iconic" (ship silhouetted off the planet limb,
 * clearly approaching) or not — and if not, the failing reason
 * (buried-on-disc / out-of-frame / behind-planet / too-small).
 *
 * Two passes per event:
 *   - `current`  : today's PLANET_COMPOSITION, no spatial lead.
 *   - `proposed` : the arrival composition for edl_or_oi/arrival events
 *                  (spatial lead + wider camR + look-bias + lower side);
 *                  gravity-assist flybys are left on the current math.
 *
 * Output: static/data/fly-camera-audit.json — consumed by the
 * /dev/fly-cameras regression dashboard.
 *
 * Invoked via `npm run audit:fly-cameras`. Pure + deterministic: it
 * reproduces `computeMissionApply` (Keplerian or trajectory-override
 * spline) exactly as /fly does, so the verdicts match the scene.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { computeMissionApply, type MissionApplyDefaults } from '../src/lib/fly-mission-apply';
import { earthPos, destinationPos } from '../src/lib/orbital/mission-arc';
import { predictShipPosAtMet } from '../src/lib/orbital/predict-ship-pos';
import { PLANET_SIZES, findFlybyPlanetFromLabel } from '../src/lib/orbital/find-flyby-planet';
import {
  planFlybyShot,
  classifyShot,
  buildArrivalComposition,
  type PlanetId,
} from '../src/lib/orbital/flyby-camera-plan';
import {
  missionDestToDataFolder,
  missionDestToHeliocentricDestinationId,
} from '../src/lib/mission-dest';

const SCALE_3D = 80;
const SHIP_VISIBLE_RADIUS = 0.4;

const MISSIONS_DIR = join('static', 'data', 'missions');
const TRAJ_DIR = join('static', 'data', 'trajectories');

const DEFAULTS: MissionApplyDefaults = {
  depFallback: 0,
  dvFallback: 0,
  depLabelFallback: 'dep',
  arrLabelFallback: 'arr',
};

interface IndexEntry {
  id: string;
  dest: string;
}
interface FlightEvent {
  met_days?: number | null;
  type?: string | null;
  label?: string | null;
}

const CINEMA_TYPES: ReadonlySet<string> = new Set(['flyby', 'edl_or_oi', 'arrival']);

interface EventVerdict {
  reason: string;
  iconic: boolean;
}

function failingReason(q: ReturnType<typeof classifyShot>): string {
  if (q.isIconic) return 'ok';
  if (q.shipInsidePlanetDisk) return 'ship-on-disc';
  if (q.shipBehindPlanet) return 'ship-behind-planet';
  if (q.shipOutOfFrame) return 'ship-out-of-frame';
  if (q.planetTooSmall) return 'planet-too-small';
  if (q.shipTooTiny) return 'ship-too-tiny';
  return 'not-iconic';
}

function evaluate(
  planetId: PlanetId,
  planetPos: { x: number; z: number },
  planetRadius: number,
  sampleShipScene: (met: number) => { x: number; y: number; z: number } | null,
  peakMet: number,
  arrival: boolean,
): EventVerdict {
  const arr = arrival ? buildArrivalComposition(planetId, planetRadius) : null;
  const plan = planFlybyShot({
    planetId,
    planetPos,
    planetRadius,
    shipPosAtMet: sampleShipScene,
    peakMet,
    composition: arr?.composition,
    iconicSeparationRadii: arr?.iconicSeparationRadii,
  });
  if (!plan) return { reason: 'no-plan', iconic: false };
  const q = classifyShot(
    plan,
    { x: planetPos.x, y: 0, z: planetPos.z },
    planetRadius,
    SHIP_VISIBLE_RADIUS,
  );
  return { reason: failingReason(q), iconic: q.isIconic };
}

function main() {
  const index = JSON.parse(readFileSync(join(MISSIONS_DIR, 'index.json'), 'utf-8')) as IndexEntry[];

  const results: Array<Record<string, unknown>> = [];
  let currentIconic = 0;
  let proposedIconic = 0;
  let totalEvents = 0;

  for (const entry of index) {
    const heliocentricDest = missionDestToHeliocentricDestinationId(entry.dest as never);
    if (!heliocentricDest) continue; // Moon/Earth — cislunar path, skip
    const folder = missionDestToDataFolder(entry.dest as never);
    const missionPath = join(MISSIONS_DIR, folder, `${entry.id}.json`);
    if (!existsSync(missionPath)) continue;
    const m = JSON.parse(readFileSync(missionPath, 'utf-8'));
    const events = (m.flight?.events ?? []) as FlightEvent[];
    const cinemaEvents = events.filter(
      (e) => e.type && CINEMA_TYPES.has(e.type) && e.met_days != null,
    );
    if (cinemaEvents.length === 0) continue;

    // Trajectory override (iconic missions ship a labeled-waypoints file).
    let override: { waypoints: unknown[] } | undefined;
    const trajPath = join(TRAJ_DIR, `${entry.id}.json`);
    if (existsSync(trajPath)) {
      const t = JSON.parse(readFileSync(trajPath, 'utf-8'));
      if (Array.isArray(t.waypoints) && t.waypoints.length >= 2)
        override = { waypoints: t.waypoints };
    }

    let r;
    try {
      r = computeMissionApply(m, DEFAULTS, override as never);
    } catch (err) {
      results.push({ id: entry.id, dest: entry.dest, error: String(err) });
      continue;
    }
    const dep = r.timeline.dep_day;
    const outDays = r.timeline.arr_day - dep;
    const sampleShipScene = (met: number) => {
      const p = predictShipPosAtMet(r.outPts, met, outDays);
      return p ? { x: p.x * SCALE_3D, y: p.y * SCALE_3D, z: p.z * SCALE_3D } : null;
    };

    for (const e of cinemaEvents) {
      totalEvents++;
      const peakMet = e.met_days as number;
      const fromLabel = findFlybyPlanetFromLabel(e.label);
      const planetId = (fromLabel?.id ?? heliocentricDest) as PlanetId;
      const planetRadius = fromLabel?.size ?? PLANET_SIZES[planetId] ?? 2.0;
      const bodyPos =
        planetId === 'earth' ? earthPos(dep + peakMet) : destinationPos(dep + peakMet, planetId);
      const planetPos = { x: bodyPos.x * SCALE_3D, z: bodyPos.z * SCALE_3D };
      const isArrival = e.type === 'edl_or_oi' || e.type === 'arrival';

      const current = evaluate(planetId, planetPos, planetRadius, sampleShipScene, peakMet, false);
      const proposed = evaluate(
        planetId,
        planetPos,
        planetRadius,
        sampleShipScene,
        peakMet,
        isArrival,
      );
      if (current.iconic) currentIconic++;
      if (proposed.iconic) proposedIconic++;

      results.push({
        id: entry.id,
        dest: entry.dest,
        eventType: e.type,
        label: e.label ?? '',
        metDays: peakMet,
        planetId,
        currentReason: current.reason,
        currentIconic: current.iconic,
        proposedReason: proposed.reason,
        proposedIconic: proposed.iconic,
        fixed: !current.iconic && proposed.iconic,
        regressed: current.iconic && !proposed.iconic,
      });
    }
  }

  results.sort((a, b) => {
    // Surface the not-yet-iconic (under proposed) first.
    const ai = a.proposedIconic ? 1 : 0;
    const bi = b.proposedIconic ? 1 : 0;
    if (ai !== bi) return ai - bi;
    return String(a.id).localeCompare(String(b.id));
  });

  const payload = {
    generatedNote: 'Run `npm run audit:fly-cameras` to refresh.',
    totals: {
      events: totalEvents,
      currentIconic,
      proposedIconic,
      fixed: results.filter((r) => r.fixed).length,
      regressed: results.filter((r) => r.regressed).length,
    },
    results,
  };
  const outPath = join('static', 'data', 'fly-camera-audit.json');
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `[audit-fly-cameras] ${totalEvents} events · current iconic ${currentIconic} → proposed ${proposedIconic} · fixed ${payload.totals.fixed} · regressed ${payload.totals.regressed}`,
  );
  console.log(`[audit-fly-cameras] wrote ${outPath}`);
}

main();
