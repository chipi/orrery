/**
 * Backfill curated `stops` arrays on the four Mars-rover traverse files
 * (Curiosity, Perseverance, Spirit, Opportunity) per ADR-072 §"curated
 * traverse stops" (#283 Slice 5b).
 *
 * Stops are placed at approximate positions along the existing
 * hand-vendored polyline by interpolating between the indexed points.
 * Labels are real mission events sourced from NASA mission docs +
 * Wikipedia summaries. Sol numbers are authoritative; lat/lon
 * resolution inherits the polyline's "approximating the path" honesty
 * (see each traverse's `credit` field). Refresh from NASA Analyst's
 * Notebook for high-fidelity coordinates in a future slice.
 *
 * Idempotent: re-running with same data is a no-op.
 *
 * Usage:  node scripts/backfill-traverse-stops.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Approximate position-along-polyline (0..1) per stop. The script
// interpolates linearly between polyline points to derive lat/lon.
const STOPS = {
  curiosity: [
    // Sol 0 = start point (handled by polyline; not duplicated as a stop).
    {
      sol: 270,
      t: 0.05,
      label: 'John Klein drill',
      kind: 'drill',
    },
    {
      sol: 1000,
      t: 0.18,
      label: 'Marias Pass',
      kind: 'feature',
    },
    {
      sol: 1647,
      t: 0.32,
      label: 'Murray Buttes',
      kind: 'panorama',
    },
    {
      sol: 2300,
      t: 0.5,
      label: 'Vera Rubin Ridge',
      kind: 'feature',
    },
    {
      sol: 3500,
      t: 0.72,
      label: 'Greenheugh Pediment',
      kind: 'feature',
    },
  ],
  perseverance: [
    {
      sol: 38,
      t: 0.04,
      label: 'Ingenuity Flight 1',
      kind: 'helicopter',
    },
    {
      sol: 200,
      t: 0.13,
      label: 'Sample 1 — Rochette',
      kind: 'sample',
    },
    {
      sol: 421,
      t: 0.27,
      label: 'Three Forks sample depot',
      kind: 'sample',
    },
    {
      sol: 750,
      t: 0.5,
      label: 'Hawksbill Gap',
      kind: 'feature',
    },
    {
      sol: 1000,
      t: 0.72,
      label: 'Margin unit traverse',
      kind: 'feature',
    },
  ],
  spirit: [
    {
      sol: 90,
      t: 0.06,
      label: 'Bonneville Crater rim',
      kind: 'feature',
    },
    {
      sol: 590,
      t: 0.25,
      label: 'Husband Hill base',
      kind: 'feature',
    },
    {
      sol: 1000,
      t: 0.42,
      label: 'Husband Hill summit',
      kind: 'panorama',
    },
    {
      sol: 1500,
      t: 0.65,
      label: 'Home Plate volcanic feature',
      kind: 'feature',
    },
    {
      sol: 2210,
      t: 0.95,
      label: 'Last contact — Troy',
      kind: 'feature',
    },
  ],
  opportunity: [
    {
      sol: 56,
      t: 0.04,
      label: 'Endurance Crater',
      kind: 'feature',
    },
    {
      sol: 1232,
      t: 0.23,
      label: 'Erebus Crater',
      kind: 'feature',
    },
    {
      sol: 1820,
      t: 0.36,
      label: 'Victoria Crater',
      kind: 'panorama',
    },
    {
      sol: 3010,
      t: 0.6,
      label: 'Endeavour Crater rim arrival',
      kind: 'feature',
    },
    {
      sol: 4500,
      t: 0.88,
      label: 'Marathon Valley',
      kind: 'feature',
    },
  ],
};

function interp(points, t) {
  const n = points.length;
  if (n === 0) return [0, 0];
  if (n === 1) return points[0];
  const idx = t * (n - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(n - 1, i0 + 1);
  const f = idx - i0;
  const [lat0, lon0] = points[i0];
  const [lat1, lon1] = points[i1];
  return [lat0 + (lat1 - lat0) * f, lon0 + (lon1 - lon0) * f];
}

async function backfill(roverId, stops) {
  const filePath = resolve(REPO_ROOT, 'static/data/mars-traverses', `${roverId}.json`);
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.points) || data.points.length < 2) {
    console.log(`  ⚠ ${roverId}: polyline missing, skipped`);
    return;
  }
  data.stops = stops.map((s) => {
    const [lat, lon] = interp(data.points, s.t);
    return {
      sol: s.sol,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      label: s.label,
      kind: s.kind,
    };
  });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${roverId}: ${data.stops.length} stops backfilled`);
}

for (const [roverId, stops] of Object.entries(STOPS)) {
  await backfill(roverId, stops);
}
