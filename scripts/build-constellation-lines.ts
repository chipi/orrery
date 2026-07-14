// Build-time generator for constellation lines in /explore v2 (Slice 1 Part 3).
//
// Source: d3-celestial's constellations.lines.json (Olaf Frohn, BSD-3-Clause) —
// a permissive, widely-reused compilation of the modern IAU constellation figures
// as RA/Dec polylines. We convert each RA/Dec vertex to a unit direction in the
// equatorial frame (the same frame as HYG's x/y/z), place it on a display sphere,
// and bake the line segments. Result: a constellation "sky dome" centred on the
// Sun — the honest Sol-perspective pattern, consistent with the star field + the
// per-star finder. BSD attribution (+ IAU) lands on /credits in Part 4.
//
//   npx tsx scripts/build-constellation-lines.ts [--from /tmp/d3c.json]
//
// Output: static/data/universe/constellation-lines.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SCRIPT_VERSION = 'build-constellation-lines@2.0.0';
const SRC_URL =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
const OUT_PATH = 'static/data/universe/constellation-lines.json';

// Display radius (parsecs) for the constellation dome — a distant backdrop that
// aligns with the real stars when viewed from near the Sun.
const RADIUS_PC = 700;
const DEG = Math.PI / 180;
const round = (v: number): number => Math.round(v * 1e3) / 1e3;

/** RA/Dec (degrees) → equatorial cartesian on the display sphere (HYG's frame). */
function raDecToXyz(raDeg: number, decDeg: number): [number, number, number] {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cd = Math.cos(dec);
  return [
    round(RADIUS_PC * cd * Math.cos(ra)),
    round(RADIUS_PC * cd * Math.sin(ra)),
    round(RADIUS_PC * Math.sin(dec)),
  ];
}

interface Feature {
  id: string;
  geometry: { type: string; coordinates: number[][][] };
}

async function load(): Promise<string> {
  const i = process.argv.indexOf('--from');
  if (i !== -1 && process.argv[i + 1]) return readFileSync(process.argv[i + 1], 'utf8');
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const doc = JSON.parse(await load()) as { features: Feature[] };
  const constellations: Array<{ con: string; vertices: number[] }> = [];
  let segments = 0;

  for (const f of doc.features) {
    const verts: number[] = [];
    // Each polyline is a chain of RA/Dec points → consecutive pairs are segments.
    for (const line of f.geometry.coordinates) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a = raDecToXyz(line[i][0], line[i][1]);
        const b = raDecToXyz(line[i + 1][0], line[i + 1][1]);
        verts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        segments++;
      }
    }
    if (verts.length > 0) constellations.push({ con: f.id, vertices: verts });
  }

  constellations.sort((a, b) => a.con.localeCompare(b.con));
  const out = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    script_version: SCRIPT_VERSION,
    source: 'd3-celestial constellation lines (Olaf Frohn) — modern IAU figures',
    source_url: 'https://github.com/ofrohn/d3-celestial',
    license_short: 'BSD-3-Clause',
    count: constellations.length,
    segment_count: segments,
    constellations,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out) + '\n', 'utf8');
  console.log(`✓ ${constellations.length} constellations, ${segments} segments → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
