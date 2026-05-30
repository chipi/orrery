/**
 * Slice 1 of Issue #283: backfill region_bounds + region_kind on every
 * surface site in moon-sites.json and mars-sites.json.
 *
 * Sources:
 * - Apollo missions: NASA Apollo Lunar Surface Journal landing coordinates
 *   + EVA traverse maps (Apollo 11 ~50m foot EVA; Apollo 15/16/17 LRV traverses 27.9/26.7/35.7 km).
 * - Mars rovers: official traverse distances (Curiosity ≈ 32 km, Perseverance ≈ 25 km,
 *   Spirit ≈ 7.73 km, Opportunity ≈ 45.16 km, Pathfinder/Sojourner ≈ 0.1 km).
 * - Soviet landers + sample-return: NASA NSSDCA catalog landing ellipses.
 * - CNSA/ISRO/JAXA: agency mission briefs.
 *
 * For traverse sites the bbox is the rover wander envelope + small margin.
 * For landing-only sites the bbox is the published landing ellipse (3-σ).
 * For planned/exploratory sites (Artemis III south-pole, ExoMars Oxia Planum)
 * the bbox is the candidate zone (region_kind = roi_quad).
 *
 * Idempotent: re-running with same data is a no-op (writes same JSON back).
 *
 * Usage:  node scripts/mockups/backfill-region-bounds.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const BOUNDS = {
  // ── MOON ───────────────────────────────────────────────────────────────
  luna9: { b: [7.06, 7.1, -64.39, -64.35], k: 'landing_ellipse' },
  luna16: { b: [-0.52, -0.48, 56.28, 56.32], k: 'landing_ellipse' },
  luna17: { b: [38.2, 38.36, -35.1, -34.9], k: 'traverse_bbox' }, // Lunokhod 1 ≈ 10.5 km
  luna21: { b: [25.78, 25.92, 30.3, 30.6], k: 'traverse_bbox' }, // Lunokhod 2 ≈ 39 km
  luna24: { b: [12.23, 12.27, 62.18, 62.22], k: 'landing_ellipse' },
  apollo11: { b: [0.63, 0.71, 23.42, 23.52], k: 'landing_ellipse' }, // foot EVA ≈ 50 m → essentially landing ellipse
  apollo12: { b: [-3.05, -2.97, -23.46, -23.38], k: 'landing_ellipse' },
  apollo14: { b: [-3.7, -3.6, -17.55, -17.39], k: 'traverse_bbox' }, // foot EVA ≈ 3.5 km
  apollo15: { b: [26.06, 26.2, 3.53, 3.73], k: 'traverse_bbox' }, // LRV ≈ 27.9 km
  apollo16: { b: [-9.05, -8.89, 15.41, 15.59], k: 'traverse_bbox' }, // LRV ≈ 26.7 km
  apollo17: { b: [20.11, 20.28, 30.65, 30.9], k: 'traverse_bbox' }, // LRV ≈ 35.7 km
  change3: { b: [44.11, 44.13, -19.52, -19.5], k: 'traverse_bbox' }, // Yutu ≈ 114 m
  change4: { b: [-45.55, -45.42, 177.55, 177.65], k: 'traverse_bbox' }, // Yutu-2 ongoing far-side
  change5: { b: [43.08, 43.12, -51.84, -51.76], k: 'landing_ellipse' },
  change6: { b: [-41.65, -41.55, -153.95, -153.85], k: 'landing_ellipse' },
  chandrayaan3: { b: [-69.4, -69.34, 32.32, 32.38], k: 'traverse_bbox' }, // Pragyan ≈ 100 m
  slim: { b: [-13.33, -13.29, 25.22, 25.26], k: 'landing_ellipse' },
  artemis3: { b: [-90, -88.5, -10, 10], k: 'roi_quad' }, // Lunar South-Pole candidate zone
  beresheet: { b: [32.58, 32.61, 19.33, 19.37], k: 'landing_ellipse' }, // SpaceIL crash site

  // ── MARS ───────────────────────────────────────────────────────────────
  mars2: { b: [-45.5, -44.5, 312.5, 313.5], k: 'landing_ellipse' }, // crashed on descent — approximate
  mars3: { b: [-45.55, -44.55, 201.5, 202.5], k: 'landing_ellipse' }, // briefly landed
  mars6: { b: [-24.4, -23.4, -19.9, -18.9], k: 'landing_ellipse' }, // lost during descent
  'viking1-lander': { b: [22.3, 22.65, 311.85, 312.2], k: 'landing_ellipse' },
  'viking2-lander': { b: [47.52, 47.82, 134.15, 134.45], k: 'landing_ellipse' },
  'mars-pathfinder': { b: [19.08, 19.11, 326.76, 326.8], k: 'traverse_bbox' }, // Sojourner ≈ 100 m
  beagle2: { b: [11.45, 11.61, 90.35, 90.51], k: 'landing_ellipse' }, // lost — approximate
  spirit: { b: [-14.65, -14.5, 175.4, 175.55], k: 'traverse_bbox' }, // 7.73 km
  opportunity: { b: [-2.35, -1.85, -5.8, -5.3], k: 'traverse_bbox' }, // 45.16 km
  phoenix: { b: [67.92, 68.52, -126.1, -125.3], k: 'landing_ellipse' },
  curiosity: { b: [-4.7, -4.5, 137.35, 137.55], k: 'traverse_bbox' }, // 32 km, ongoing
  schiaparelli: { b: [-2.15, -1.99, -6.29, -6.13], k: 'landing_ellipse' }, // crashed
  insight: { b: [4.1, 4.9, 135.27, 135.97], k: 'landing_ellipse' },
  perseverance: { b: [18.3, 18.55, 77.3, 77.6], k: 'traverse_bbox' }, // 25 km, ongoing
  zhurong: { b: [25.06, 25.12, 109.9, 109.96], k: 'traverse_bbox' }, // 1.92 km, ended
  'exomars-rosalind-franklin': { b: [17.5, 18.9, -35.7, -34.4], k: 'roi_quad' }, // Oxia Planum candidate
};

const ORDER = [
  'id',
  'kind',
  'agency',
  'nation',
  'year',
  'landing_date',
  'lat',
  'lon',
  'region_bounds',
  'region_kind',
  'region_bearing_deg',
  'altitude_km',
  'inclination_deg',
  'eccentricity',
  'crewed',
  'status',
  'surface_status',
  'surface_duration_days',
  'eva_duration_hours',
  'samples_kg',
  'data_quality',
  'credit',
  'mission_id',
  'fleet_refs',
  'links',
];

function reorder(site) {
  const out = {};
  for (const key of ORDER) {
    if (key in site) out[key] = site[key];
  }
  // Preserve unknown fields (underscore-prefixed notes etc.) at the end
  for (const key of Object.keys(site)) {
    if (!(key in out)) out[key] = site[key];
  }
  return out;
}

async function backfillFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const site = data[i];
    if (site.kind !== 'surface') continue;
    const cfg = BOUNDS[site.id];
    if (!cfg) {
      skipped++;
      console.log(`  ⚠ no bbox data for "${site.id}" — skipped`);
      continue;
    }
    const [lat_min, lat_max, lon_min, lon_max] = cfg.b;
    site.region_bounds = { lat_min, lat_max, lon_min, lon_max };
    site.region_kind = cfg.k;
    data[i] = reorder(site);
    changed++;
  }

  const out = JSON.stringify(data, null, 2) + '\n';
  await writeFile(filePath, out, 'utf8');
  console.log(`✓ ${filePath.split('/').pop()}: ${changed} sites updated, ${skipped} skipped`);
}

await backfillFile(resolve(REPO_ROOT, 'static/data/moon-sites.json'));
await backfillFile(resolve(REPO_ROOT, 'static/data/mars-sites.json'));
