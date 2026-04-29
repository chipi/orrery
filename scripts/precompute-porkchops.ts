/**
 * Pre-computes the per-destination porkchop grids for /plan
 * (v0.1.6 / ADR-026). Runs at build time; writes JSON files to
 * `static/data/porkchop/earth-to-{id}.json`.
 *
 * Invoked via `npm run precompute-porkchops` (and chained into
 * `npm run build`). Idempotent — same inputs produce identical bytes
 * because the Lambert solver is deterministic and we round to a
 * fixed precision before serialising.
 *
 * Per ADR-016 the resulting JSON files are committed to the repo:
 * /plan loads them via `$lib/data#getPorkchopGrid` for instant first
 * paint and full offline capability.
 *
 * Run with: npx tsx scripts/precompute-porkchops.ts
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { computePorkchopGrid, type LambertRequest } from '../src/lib/lambert-grid';
import type { DestinationId } from '../src/lib/lambert-grid.constants';
import type { MissionType } from '../src/types/porkchop-grid';

interface DestinationSpec {
  id: DestinationId;
  /** Transfer-time range [start, end] in days. */
  tof_range_days: [number, number];
  /** Mission types offered. Inner planets get both; gas giants FLYBY only. */
  mission_types: MissionType[];
  /** Per-mission-type ∆v added on the client when LANDING is selected.
   *  Sourced from public NASA technical reports — approximate values. */
  dv_orbit_insertion: Partial<Record<MissionType, number>>;
  /** "days" for inner planets, "years" for outer (auto-switch
   *  threshold: tof_range_days[1] > 730 per ADR-026 §Y-axis units). */
  tof_axis_unit: 'days' | 'years';
}

const DESTINATIONS: DestinationSpec[] = [
  {
    id: 'mercury',
    tof_range_days: [80, 250],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 8.6, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'venus',
    tof_range_days: [80, 320],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 3.7, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'mars',
    tof_range_days: [80, 520],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 4.1, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'jupiter',
    tof_range_days: [400, 1500],
    mission_types: ['FLYBY'],
    dv_orbit_insertion: { FLYBY: 0 },
    tof_axis_unit: 'years',
  },
  {
    id: 'saturn',
    tof_range_days: [800, 3000],
    mission_types: ['FLYBY'],
    dv_orbit_insertion: { FLYBY: 0 },
    tof_axis_unit: 'years',
  },
];

const DEP_RANGE_DAYS: [number, number] = [0, 1460];
const STEPS: [number, number] = [112, 100];
const OUT_DIR = 'static/data/porkchop';

/** Round to 4 decimal places so the JSON serialises deterministically
 *  across runs (avoids 0.30000000000000004 noise that breaks
 *  byte-identical idempotency). */
function quantise(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function precomputeOne(spec: DestinationSpec): Promise<string> {
  const req: LambertRequest = {
    id: 0,
    depRange: DEP_RANGE_DAYS,
    arrRange: spec.tof_range_days,
    steps: STEPS,
    destinationId: spec.id,
  };
  const result = computePorkchopGrid(
    req,
    () => {},
    () => false,
  );
  if (!result)
    throw new Error(`Lambert returned null for ${spec.id} — should be impossible at build time`);

  const grid = result.grid.map((row) => row.map(quantise));
  const out = {
    destination: spec.id,
    dep_range_days: DEP_RANGE_DAYS,
    tof_range_days: spec.tof_range_days,
    steps: STEPS,
    mission_types: spec.mission_types,
    dv_orbit_insertion: spec.dv_orbit_insertion,
    tof_axis_unit: spec.tof_axis_unit,
    grid,
    credit:
      'Computed at build time via Lambert solver (src/lib/lambert.ts). Ephemerides: static/data/planets.json. dv_orbit_insertion approximated from public NASA technical reports.',
  };
  return JSON.stringify(out, null, 2) + '\n';
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Pre-computing porkchop grids:');
  for (const spec of DESTINATIONS) {
    const path = join(OUT_DIR, `earth-to-${spec.id}.json`);
    process.stdout.write(`  ${spec.id}…`);
    const json = await precomputeOne(spec);
    await writeFile(path, json);
    process.stdout.write(` ${(json.length / 1024).toFixed(0)} KB\n`);
  }
  console.log(`Done. ${DESTINATIONS.length} grids written to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
