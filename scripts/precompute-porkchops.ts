/**
 * Pre-computes the per-destination porkchop grids for /plan
 * (v0.1.6 / ADR-026 + v0.3.x / ADR-028). Runs at build time; writes JSON files to
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
import { computePorkchopGrid, DV_FAILED, type LambertRequest } from '../src/lib/lambert-grid';
import type { DestinationId } from '../src/lib/lambert-grid.constants';
import type { MissionType } from '../src/types/porkchop-grid';
import { geoTransferDv } from '../src/lib/lambert-geocentric';

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
  {
    id: 'uranus',
    tof_range_days: [3000, 6500],
    mission_types: ['FLYBY'],
    dv_orbit_insertion: { FLYBY: 0 },
    tof_axis_unit: 'years',
  },
  {
    id: 'neptune',
    tof_range_days: [10000, 20000],
    mission_types: ['FLYBY'],
    dv_orbit_insertion: { FLYBY: 0 },
    tof_axis_unit: 'years',
  },
  {
    id: 'pluto',
    tof_range_days: [12000, 22000],
    mission_types: ['FLYBY'],
    dv_orbit_insertion: { FLYBY: 0 },
    tof_axis_unit: 'years',
  },
  {
    id: 'ceres',
    // Short-way Lambert (ADR-008) only converges for ~100–500 d TOF on this
    // geometry; [800, 1800] (ADR-028 draft) yields an all-failed grid.
    tof_range_days: [120, 480],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 3.9, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'vesta',
    // Inner-belt at 2.36 AU — similar Lambert convergence window as Ceres
    // but slightly shorter (a is smaller). LANDING ∆v lower than Ceres
    // because Vesta's escape velocity (~360 m/s) is a fraction of Ceres'.
    tof_range_days: [100, 420],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 2.5, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'psyche',
    // Outer-belt at 2.92 AU — Lambert window stretches longer than Ceres
    // and the LANDING insertion shows the same low-gravity discount as
    // Vesta (Psyche is metal-rich but small).
    tof_range_days: [140, 540],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 2.5, FLYBY: 0 },
    tof_axis_unit: 'days',
  },
  {
    id: 'bennu',
    // Near-Earth asteroid at 1.13 AU — very short Lambert TOFs and an
    // almost-free insertion (Bennu's escape velocity is < 0.2 m/s; the
    // 1.0 km/s figure is the OSIRIS-REx rendezvous-and-survey budget,
    // not actual gravitational capture). Eccentric arrival (e=0.20).
    tof_range_days: [60, 300],
    mission_types: ['LANDING', 'FLYBY'],
    dv_orbit_insertion: { LANDING: 1.0, FLYBY: 0 },
    tof_axis_unit: 'days',
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
  let failed = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell >= DV_FAILED - 1e-6) failed++;
    }
  }
  const cells = grid.length * grid[0].length;
  const convPct = Math.round((100 * (cells - failed)) / cells);
  const out = {
    destination: spec.id,
    dep_range_days: DEP_RANGE_DAYS,
    tof_range_days: spec.tof_range_days,
    steps: STEPS,
    mission_types: spec.mission_types,
    dv_orbit_insertion: spec.dv_orbit_insertion,
    tof_axis_unit: spec.tof_axis_unit,
    grid,
    credit: `Computed at build time via Lambert solver (src/lib/lambert.ts). ${spec.id}: ${convPct}% cells converged (${failed} of ${cells} marked no-solution). Ephemerides: static/data/planets.json and static/data/small-bodies.json (Ceres, Pluto). dv_orbit_insertion approximated from public agency technical reports.`,
  };
  return JSON.stringify(out, null, 2) + '\n';
}

// ─── Geocentric Earth→Moon grid (ADR-085) ──────────────────────────
// The Moon has no heliocentric orbit, so it is NOT a heliocentric Lambert
// destination — its grid is built geocentrically here via `geoTransferDv`
// (µ_Earth, TLI + patched-conic LOI). Same [width, height] as the helio grids
// so the mobile magnifier stays valid; its own dep/tof ranges + colour scale.

const MOON_DEP_RANGE_DAYS: [number, number] = [0, 365];
// Full #308 band [3, 14 d]: the low-branch Lambert covers the fast side up to
// the ~5 d minimum-energy ceiling; the high branch (α → 2π − α, ADR-085) covers
// the slow / phasing transfers out to 14 d. No more false-"unreachable" cells
// above 5 d.
const MOON_TOF_RANGE_DAYS: [number, number] = [3, 14];

function precomputeGeoMoon(): string {
  const [w, h] = STEPS;
  const [depStart, depEnd] = MOON_DEP_RANGE_DAYS;
  const [tofStart, tofEnd] = MOON_TOF_RANGE_DAYS;

  const grid: number[][] = new Array(h);
  let failed = 0;
  let dvMin = Infinity;
  let dvMax = -Infinity;
  for (let j = 0; j < h; j++) {
    const tof = tofStart + (j / (h - 1)) * (tofEnd - tofStart);
    grid[j] = new Array(w);
    for (let i = 0; i < w; i++) {
      const dep = depStart + (i / (w - 1)) * (depEnd - depStart);
      const t = geoTransferDv(dep, tof);
      const dv = quantise(t.total);
      grid[j][i] = dv;
      if (t.feasible) {
        if (dv < dvMin) dvMin = dv;
        if (dv > dvMax) dvMax = dv;
      } else {
        failed++;
      }
    }
  }
  const cells = w * h;
  const convPct = Math.round((100 * (cells - failed)) / cells);
  // A touch of headroom so the cheapest cells aren't pinned to the darkest stop.
  const colorRange: [number, number] = [quantise(dvMin - 0.1), quantise(dvMax + 0.1)];

  const out = {
    destination: 'moon' as const,
    dep_range_days: MOON_DEP_RANGE_DAYS,
    tof_range_days: MOON_TOF_RANGE_DAYS,
    steps: STEPS,
    mission_types: ['LANDING'] as MissionType[],
    // LOI is baked per-cell into the grid total (it varies with lunar distance),
    // so no fixed insertion is added at display time — unlike the heliocentric path.
    dv_orbit_insertion: { LANDING: 0 } as Partial<Record<MissionType, number>>,
    tof_axis_unit: 'days' as const,
    dv_color_range: colorRange,
    grid,
    credit: `Computed at build time via the geocentric Lambert model (src/lib/lambert-geocentric.ts, ADR-085). Earth→Moon: ${convPct}% cells feasible (${failed} of ${cells} below the parabolic floor). Full [3, 14 d] TOF band — low-branch Lambert to the ~5 d minimum-energy ceiling, high branch (α → 2π − α) for the slow/phasing transfers above it. ∆v = TLI (µ_Earth LEO departure) + LOI (patched-conic, µ_Moon). Moon ephemeris: src/lib/astronomy/moon.ts (Schlyter/Brown analytic). Representative two-body estimate — validated against Apollo TLI ~3.05–3.15 / LOI ~0.8–0.9 km/s.`,
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
  // Geocentric Moon grid (ADR-085).
  process.stdout.write('  moon (geocentric)…');
  const moonJson = precomputeGeoMoon();
  await writeFile(join(OUT_DIR, 'earth-to-moon.json'), moonJson);
  process.stdout.write(` ${(moonJson.length / 1024).toFixed(0)} KB\n`);

  console.log(`Done. ${DESTINATIONS.length + 1} grids written to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
